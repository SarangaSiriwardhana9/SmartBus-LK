/* eslint-disable @typescript-eslint/prefer-as-const */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Booking,
  BookingDocument,
  BookingStatus,
} from '../schemas/booking.schema';
import { Trip, TripDocument } from '../schemas/trip.schema';
import { Bus, BusDocument } from '../schemas/bus.schema';
import { Route, RouteDocument } from '../schemas/route.schema';
import { BusRoute, BusRouteDocument } from '../schemas/bus-route.schema';
import { User, UserDocument, UserRole } from '../schemas/user.schema';
import { ReportFilterDto, ReportPeriod } from './dto/report-filter.dto';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    @InjectModel(Trip.name) private tripModel: Model<TripDocument>,
    @InjectModel(Bus.name) private busModel: Model<BusDocument>,
    @InjectModel(Route.name) private routeModel: Model<RouteDocument>,
    @InjectModel(BusRoute.name) private busRouteModel: Model<BusRouteDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  // Revenue Reports
  async getRevenueReport(filters: ReportFilterDto, user?: UserDocument) {
    const dateFilter = this.getDateFilter(filters);
    const matchStage = this.buildMatchStage(filters, user, dateFilter);

    const pipeline = [
      matchStage,
      {
        $match: {
          status: BookingStatus.CONFIRMED,
          'paymentDetails.paymentStatus': 'completed',
        },
      },
      {
        $group: {
          _id: this.getGroupStage(filters.period),
          totalRevenue: { $sum: '$pricing.totalAmount' },
          totalBookings: { $sum: 1 },
          totalPassengers: { $sum: { $size: '$seatDetails' } },
          averageBookingValue: { $avg: '$pricing.totalAmount' },
        },
      },
      { $sort: { _id: 1 as 1 } },
    ];

    const [revenueData, totalSummary] = await Promise.all([
      this.bookingModel.aggregate(pipeline),
      this.getRevenueSummary(matchStage),
    ]);

    return {
      revenueData,
      totalSummary,
      period: filters.period || ReportPeriod.MONTHLY,
    };
  }

  // Booking Analytics
  async getBookingAnalytics(filters: ReportFilterDto, user?: UserDocument) {
    const dateFilter = this.getDateFilter(filters);
    const matchStage = this.buildMatchStage(filters, user, dateFilter);

    const [
      bookingTrends,
      topRoutes,
      peakTimes,
      cancellationAnalysis,
      bookingsByStatus,
    ] = await Promise.all([
      this.getBookingTrends(matchStage, filters.period),
      this.getTopRoutes(matchStage),
      this.getPeakTimes(matchStage),
      this.getCancellationAnalysis(matchStage),
      this.getBookingsByStatus(matchStage),
    ]);

    return {
      bookingTrends,
      topRoutes,
      peakTimes,
      cancellationAnalysis,
      bookingsByStatus,
    };
  }

  // Bus Performance Reports
  async getBusPerformanceReport(filters: ReportFilterDto, user?: UserDocument) {
    const dateFilter = this.getDateFilter(filters);
    const matchStage = this.buildMatchStage(filters, user, dateFilter);

    const busPerformance = await this.bookingModel.aggregate([
      matchStage,
      {
        $lookup: {
          from: 'trips',
          localField: 'tripId',
          foreignField: '_id',
          as: 'trip',
        },
      },
      { $unwind: '$trip' },
      {
        $lookup: {
          from: 'busroutes',
          localField: 'trip.busRouteId',
          foreignField: '_id',
          as: 'busRoute',
        },
      },
      { $unwind: '$busRoute' },
      {
        $lookup: {
          from: 'buses',
          localField: 'busRoute.busId',
          foreignField: '_id',
          as: 'bus',
        },
      },
      { $unwind: '$bus' },
      {
        $group: {
          _id: '$bus._id',
          busRegistration: { $first: '$bus.registrationNumber' },
          busType: { $first: '$bus.specifications.busType' },
          totalSeats: { $first: '$bus.specifications.totalSeats' },
          totalBookings: { $sum: 1 },
          totalRevenue: { $sum: '$pricing.totalAmount' },
          totalPassengers: { $sum: { $size: '$seatDetails' } },
          uniqueTrips: { $addToSet: '$trip._id' },
        },
      },
      {
        $addFields: {
          tripCount: { $size: '$uniqueTrips' },
          occupancyRate: {
            $multiply: [
              {
                $divide: [
                  '$totalPassengers',
                  { $multiply: ['$totalSeats', '$tripCount'] },
                ],
              },
              100,
            ],
          },
          revenuePerTrip: { $divide: ['$totalRevenue', '$tripCount'] },
        },
      },
      { $sort: { totalRevenue: -1 } },
    ]);

    return {
      busPerformance,
      totalBuses: busPerformance.length,
    };
  }

  // Occupancy Rate Analysis
  async getOccupancyAnalysis(filters: ReportFilterDto, user?: UserDocument) {
    const dateFilter = this.getDateFilter(filters);
    const matchStage = this.buildMatchStage(filters, user, dateFilter);

    const occupancyData = await this.bookingModel.aggregate([
      matchStage,
      {
        $lookup: {
          from: 'trips',
          localField: 'tripId',
          foreignField: '_id',
          as: 'trip',
        },
      },
      { $unwind: '$trip' },
      {
        $lookup: {
          from: 'busroutes',
          localField: 'trip.busRouteId',
          foreignField: '_id',
          as: 'busRoute',
        },
      },
      { $unwind: '$busRoute' },
      {
        $lookup: {
          from: 'buses',
          localField: 'busRoute.busId',
          foreignField: '_id',
          as: 'bus',
        },
      },
      { $unwind: '$bus' },
      {
        $lookup: {
          from: 'routes',
          localField: 'busRoute.routeId',
          foreignField: '_id',
          as: 'route',
        },
      },
      { $unwind: '$route' },
      {
        $group: {
          _id: {
            tripId: '$trip._id',
            routeId: '$route._id',
            tripDate: '$trip.tripDate',
          },
          routeName: { $first: '$route.routeName' },
          totalSeats: { $first: '$bus.specifications.totalSeats' },
          bookedSeats: { $sum: { $size: '$seatDetails' } },
        },
      },
      {
        $addFields: {
          occupancyRate: {
            $multiply: [{ $divide: ['$bookedSeats', '$totalSeats'] }, 100],
          },
        },
      },
      {
        $group: {
          _id: '$_id.routeId',
          routeName: { $first: '$routeName' },
          averageOccupancy: { $avg: '$occupancyRate' },
          totalTrips: { $sum: 1 },
          totalBookedSeats: { $sum: '$bookedSeats' },
          totalAvailableSeats: { $sum: '$totalSeats' },
        },
      },
      { $sort: { averageOccupancy: -1 } },
    ]);

    return {
      occupancyData,
      overallOccupancy: this.calculateOverallOccupancy(occupancyData),
    };
  }

  // Financial Summary
  async getFinancialSummary(filters: ReportFilterDto, user?: UserDocument) {
    const dateFilter = this.getDateFilter(filters);
    const matchStage = this.buildMatchStage(filters, user, dateFilter);

    const [
      totalRevenue,
      totalTaxes,
      totalDiscounts,
      revenueByPaymentMethod,
      monthlyTrends,
    ] = await Promise.all([
      this.getTotalRevenue(matchStage),
      this.getTotalTaxes(matchStage),
      this.getTotalDiscounts(matchStage),
      this.getRevenueByPaymentMethod(matchStage),
      this.getMonthlyRevenueTrends(matchStage),
    ]);

    return {
      totalRevenue,
      totalTaxes,
      totalDiscounts,
      netRevenue: totalRevenue - totalTaxes,
      revenueByPaymentMethod,
      monthlyTrends,
    };
  }

  // Helper methods
  private getDateFilter(filters: ReportFilterDto) {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (filters.period) {
      case ReportPeriod.DAILY:
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
      case ReportPeriod.WEEKLY:
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case ReportPeriod.MONTHLY:
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
      case ReportPeriod.YEARLY:
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case ReportPeriod.CUSTOM:
        startDate = filters.startDate
          ? new Date(filters.startDate)
          : new Date(now.getFullYear(), 0, 1);
        endDate = filters.endDate ? new Date(filters.endDate) : now;
        break;
      default:
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
    }

    return { startDate, endDate };
  }

  private buildMatchStage(
    filters: ReportFilterDto,
    user?: UserDocument,
    dateFilter?: any,
  ) {
    const matchConditions: any = {};

    if (dateFilter) {
      matchConditions.createdAt = {
        $gte: dateFilter.startDate,
        $lte: dateFilter.endDate,
      };
    }

    // Role-based filtering
    if (user && user.role === UserRole.BUS_OWNER) {
      // Need to match bookings for trips from user's buses
      // This will be handled in the aggregation pipeline
      matchConditions.busOwnerId = user._id;
    }

    if (filters.busOwnerId) {
      matchConditions.busOwnerId = filters.busOwnerId;
    }

    return { $match: matchConditions };
  }

  private getGroupStage(period?: ReportPeriod) {
    switch (period) {
      case ReportPeriod.DAILY:
        return {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
        };
      case ReportPeriod.WEEKLY:
        return {
          year: { $year: '$createdAt' },
          week: { $week: '$createdAt' },
        };
      case ReportPeriod.YEARLY:
        return { year: { $year: '$createdAt' } };
      default:
        return {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        };
    }
  }

  private async getRevenueSummary(matchStage: any) {
    const summary = await this.bookingModel.aggregate([
      matchStage,
      {
        $match: {
          status: BookingStatus.CONFIRMED,
          'paymentDetails.paymentStatus': 'completed',
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$pricing.totalAmount' },
          totalBookings: { $sum: 1 },
          totalTaxes: { $sum: '$pricing.taxes' },
          totalDiscounts: { $sum: '$pricing.discount' },
          averageBookingValue: { $avg: '$pricing.totalAmount' },
        },
      },
    ]);

    return (
      summary[0] || {
        totalRevenue: 0,
        totalBookings: 0,
        totalTaxes: 0,
        totalDiscounts: 0,
        averageBookingValue: 0,
      }
    );
  }

  private async getBookingTrends(matchStage: any, period?: ReportPeriod) {
    return this.bookingModel.aggregate([
      matchStage,
      {
        $group: {
          _id: this.getGroupStage(period),
          totalBookings: { $sum: 1 },
          confirmedBookings: {
            $sum: {
              $cond: [{ $eq: ['$status', BookingStatus.CONFIRMED] }, 1, 0],
            },
          },
          cancelledBookings: {
            $sum: {
              $cond: [{ $eq: ['$status', BookingStatus.CANCELLED] }, 1, 0],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  }

  private async getTopRoutes(matchStage: any) {
    return this.bookingModel.aggregate([
      matchStage,
      { $match: { status: BookingStatus.CONFIRMED } },
      {
        $lookup: {
          from: 'trips',
          localField: 'tripId',
          foreignField: '_id',
          as: 'trip',
        },
      },
      { $unwind: '$trip' },
      {
        $lookup: {
          from: 'busroutes',
          localField: 'trip.busRouteId',
          foreignField: '_id',
          as: 'busRoute',
        },
      },
      { $unwind: '$busRoute' },
      {
        $lookup: {
          from: 'routes',
          localField: 'busRoute.routeId',
          foreignField: '_id',
          as: 'route',
        },
      },
      { $unwind: '$route' },
      {
        $group: {
          _id: '$route._id',
          routeName: { $first: '$route.routeName' },
          origin: { $first: '$route.origin' },
          destination: { $first: '$route.destination' },
          totalBookings: { $sum: 1 },
          totalRevenue: { $sum: '$pricing.totalAmount' },
        },
      },
      { $sort: { totalBookings: -1 } },
      { $limit: 10 },
    ]);
  }

  private async getPeakTimes(matchStage: any) {
    return this.bookingModel.aggregate([
      matchStage,
      { $match: { status: BookingStatus.CONFIRMED } },
      {
        $group: {
          _id: {
            hour: { $hour: '$createdAt' },
            dayOfWeek: { $dayOfWeek: '$createdAt' },
          },
          bookingCount: { $sum: 1 },
        },
      },
      { $sort: { bookingCount: -1 } },
    ]);
  }

  private async getCancellationAnalysis(matchStage: any) {
    const cancellationData = await this.bookingModel.aggregate([
      matchStage,
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const totalBookings = cancellationData.reduce(
      (sum, item) => sum + item.count,
      0,
    );
    const cancelledBookings =
      cancellationData.find((item) => item._id === BookingStatus.CANCELLED)
        ?.count || 0;
    const cancellationRate =
      totalBookings > 0 ? (cancelledBookings / totalBookings) * 100 : 0;

    return {
      cancellationData,
      cancellationRate: Math.round(cancellationRate * 100) / 100,
    };
  }

  private async getBookingsByStatus(matchStage: any) {
    return this.bookingModel.aggregate([
      matchStage,
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$pricing.totalAmount' },
        },
      },
    ]);
  }

  private async getTotalRevenue(matchStage: any) {
    const result = await this.bookingModel.aggregate([
      matchStage,
      {
        $match: {
          status: BookingStatus.CONFIRMED,
          'paymentDetails.paymentStatus': 'completed',
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$pricing.totalAmount' },
        },
      },
    ]);

    return result[0]?.total || 0;
  }

  private async getTotalTaxes(matchStage: any) {
    const result = await this.bookingModel.aggregate([
      matchStage,
      {
        $match: {
          status: BookingStatus.CONFIRMED,
          'paymentDetails.paymentStatus': 'completed',
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$pricing.taxes' },
        },
      },
    ]);

    return result[0]?.total || 0;
  }

  private async getTotalDiscounts(matchStage: any) {
    const result = await this.bookingModel.aggregate([
      matchStage,
      {
        $match: {
          status: BookingStatus.CONFIRMED,
          'paymentDetails.paymentStatus': 'completed',
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$pricing.discount' },
        },
      },
    ]);

    return result[0]?.total || 0;
  }

  private async getRevenueByPaymentMethod(matchStage: any) {
    return this.bookingModel.aggregate([
      matchStage,
      {
        $match: {
          status: BookingStatus.CONFIRMED,
          'paymentDetails.paymentStatus': 'completed',
        },
      },
      {
        $group: {
          _id: '$paymentDetails.paymentMethod',
          totalRevenue: { $sum: '$pricing.totalAmount' },
          bookingCount: { $sum: 1 },
        },
      },
    ]);
  }

  private async getMonthlyRevenueTrends(matchStage: any) {
    return this.bookingModel.aggregate([
      matchStage,
      {
        $match: {
          status: BookingStatus.CONFIRMED,
          'paymentDetails.paymentStatus': 'completed',
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          totalRevenue: { $sum: '$pricing.totalAmount' },
          bookingCount: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);
  }

  private calculateOverallOccupancy(occupancyData: any[]) {
    if (occupancyData.length === 0) return 0;

    const totalBookedSeats = occupancyData.reduce(
      (sum, item) => sum + item.totalBookedSeats,
      0,
    );
    const totalAvailableSeats = occupancyData.reduce(
      (sum, item) => sum + item.totalAvailableSeats,
      0,
    );

    return totalAvailableSeats > 0
      ? Math.round((totalBookedSeats / totalAvailableSeats) * 100 * 100) / 100
      : 0;
  }
}
