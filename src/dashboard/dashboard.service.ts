/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  User,
  UserDocument,
  UserRole,
  UserStatus,
} from '../schemas/user.schema';
import { Bus, BusDocument, BusStatus } from '../schemas/bus.schema';
import { Route, RouteDocument } from '../schemas/route.schema';
import { BusRoute, BusRouteDocument } from '../schemas/bus-route.schema';
import {
  Booking,
  BookingDocument,
  BookingStatus,
} from '../schemas/booking.schema';
import { Trip, TripDocument, TripStatus } from '../schemas/trip.schema';
import {
  BusOwnerProfile,
  BusOwnerProfileDocument,
  VerificationStatus,
} from '../schemas/bus-owner-profile.schema';
import { UserDocument as CurrentUserDocument } from '../schemas/user.schema';
import { DashboardFilterDto, DateRange } from './dto/dashboard-filter.dto';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Bus.name) private busModel: Model<BusDocument>,
    @InjectModel(Route.name) private routeModel: Model<RouteDocument>,
    @InjectModel(BusRoute.name) private busRouteModel: Model<BusRouteDocument>,
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    @InjectModel(Trip.name) private tripModel: Model<TripDocument>,
    @InjectModel(BusOwnerProfile.name)
    private busOwnerProfileModel: Model<BusOwnerProfileDocument>,
  ) {}

  // Admin Dashboard
  async getAdminDashboard(filters: DashboardFilterDto) {
    const dateFilter = this.getDateFilter(filters);

    const [
      totalUsers,
      totalBuses,
      totalRoutes,
      totalBookings,
      pendingApprovals,
      recentUsers,
      revenueData,
      topRoutes,
      systemStats,
    ] = await Promise.all([
      this.userModel.countDocuments(),
      this.busModel.countDocuments(),
      this.routeModel.countDocuments(),
      this.bookingModel.countDocuments(),
      this.getPendingApprovals(),
      this.getRecentUsers(filters.limit || 5),
      this.getRevenueData(dateFilter),
      this.getTopRoutes(filters.limit || 5),
      this.getSystemStats(dateFilter),
    ]);

    return {
      overview: {
        totalUsers,
        totalBuses,
        totalRoutes,
        totalBookings,
      },
      pendingApprovals,
      recentUsers,
      revenueData,
      topRoutes,
      systemStats,
    };
  }

  // Bus Owner Dashboard
  async getBusOwnerDashboard(userId: string, filters: DashboardFilterDto) {
    const dateFilter = this.getDateFilter(filters);

    // Get user's buses
    const userBuses = await this.busModel.find({ ownerId: userId });
    const busIds = userBuses.map((bus) => bus._id);

    // Get bus routes for user's buses
    const userBusRoutes = await this.busRouteModel.find({
      busId: { $in: busIds },
    });
    const busRouteIds = userBusRoutes.map((br) => br._id);

    // Get trips for user's bus routes
    const userTrips = await this.tripModel.find({
      busRouteId: { $in: busRouteIds },
    });
    const tripIds = userTrips.map((trip) => trip._id);

    const [
      fleetOverview,
      todaysTrips,
      recentBookings,
      revenueData,
      busPerformance,
    ] = await Promise.all([
      this.getFleetOverview(busIds),
      this.getTodaysTrips(busRouteIds),
      this.getRecentBookings(tripIds, filters.limit || 10),
      this.getOwnerRevenueData(tripIds, dateFilter),
      this.getBusPerformance(busIds, dateFilter),
    ]);

    return {
      fleetOverview,
      todaysTrips,
      recentBookings,
      revenueData,
      busPerformance,
    };
  }

  // Passenger Dashboard
  async getPassengerDashboard(userId: string, filters: DashboardFilterDto) {
    const [upcomingTrips, recentBookings, bookingHistory, favoriteRoutes] =
      await Promise.all([
        this.getUpcomingTrips(userId),
        this.getPassengerRecentBookings(userId, filters.limit || 5),
        this.getBookingHistory(userId),
        this.getFavoriteRoutes(userId, filters.limit || 3),
      ]);

    return {
      upcomingTrips,
      recentBookings,
      bookingHistory,
      favoriteRoutes,
    };
  }

  // Driver Dashboard
  async getDriverDashboard(userId: string, filters: DashboardFilterDto) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [todaysAssignments, upcomingTrips, completedTrips, driverStats] =
      await Promise.all([
        this.getDriverTodaysAssignments(userId, today, tomorrow),
        this.getDriverUpcomingTrips(userId),
        this.getDriverCompletedTrips(userId, filters.limit || 10),
        this.getDriverStats(userId),
      ]);

    return {
      todaysAssignments,
      upcomingTrips,
      completedTrips,
      driverStats,
    };
  }

  // Conductor Dashboard
  async getConductorDashboard(userId: string, filters: DashboardFilterDto) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      todaysAssignments,
      passengerManifests,
      collectionSummary,
      conductorStats,
    ] = await Promise.all([
      this.getConductorTodaysAssignments(userId, today, tomorrow),
      this.getPassengerManifests(userId, today, tomorrow),
      this.getCollectionSummary(userId),
      this.getConductorStats(userId),
    ]);

    return {
      todaysAssignments,
      passengerManifests,
      collectionSummary,
      conductorStats,
    };
  }

  // Helper methods
  private getDateFilter(filters: DashboardFilterDto) {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (filters.dateRange) {
      case DateRange.TODAY:
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
      case DateRange.WEEK:
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case DateRange.MONTH:
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
      case DateRange.YEAR:
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case DateRange.CUSTOM:
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

  private async getPendingApprovals() {
    const [pendingBusOwners, pendingBuses] = await Promise.all([
      this.busOwnerProfileModel.countDocuments({
        verificationStatus: VerificationStatus.PENDING,
      }),
      this.busModel.countDocuments({ status: BusStatus.PENDING_APPROVAL }),
    ]);

    return {
      busOwners: pendingBusOwners,
      buses: pendingBuses,
      total: pendingBusOwners + pendingBuses,
    };
  }

  private async getRecentUsers(limit: number) {
    return this.userModel
      .find()
      .select('email role profile status createdAt')
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  private async getRevenueData(dateFilter: { startDate: Date; endDate: Date }) {
    const revenueData = await this.bookingModel.aggregate([
      {
        $match: {
          status: BookingStatus.CONFIRMED,
          'paymentDetails.paymentStatus': 'completed',
          createdAt: { $gte: dateFilter.startDate, $lte: dateFilter.endDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' },
          },
          totalRevenue: { $sum: '$pricing.totalAmount' },
          totalBookings: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]);

    const totalRevenue = await this.bookingModel.aggregate([
      {
        $match: {
          status: BookingStatus.CONFIRMED,
          'paymentDetails.paymentStatus': 'completed',
          createdAt: { $gte: dateFilter.startDate, $lte: dateFilter.endDate },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$pricing.totalAmount' },
        },
      },
    ]);

    return {
      dailyRevenue: revenueData,
      totalRevenue: totalRevenue[0]?.total || 0,
    };
  }

  private async getTopRoutes(limit: number) {
    return this.bookingModel.aggregate([
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
      { $limit: limit },
    ]);
  }

  private async getSystemStats(dateFilter: { startDate: Date; endDate: Date }) {
    const [usersByRole, busesByStatus, bookingsByStatus] = await Promise.all([
      this.userModel.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } },
      ]),
      this.busModel.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      this.bookingModel.aggregate([
        {
          $match: {
            createdAt: { $gte: dateFilter.startDate, $lte: dateFilter.endDate },
          },
        },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    return {
      usersByRole,
      busesByStatus,
      bookingsByStatus,
    };
  }

  private async getFleetOverview(busIds: any[]) {
    const [total, active, maintenance, pendingApproval] = await Promise.all([
      this.busModel.countDocuments({ _id: { $in: busIds } }),
      this.busModel.countDocuments({
        _id: { $in: busIds },
        status: BusStatus.ACTIVE,
      }),
      this.busModel.countDocuments({
        _id: { $in: busIds },
        status: BusStatus.MAINTENANCE,
      }),
      this.busModel.countDocuments({
        _id: { $in: busIds },
        status: BusStatus.PENDING_APPROVAL,
      }),
    ]);

    return { total, active, maintenance, pendingApproval };
  }

  private async getTodaysTrips(busRouteIds: any[]) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.tripModel
      .find({
        busRouteId: { $in: busRouteIds },
        tripDate: { $gte: today, $lt: tomorrow },
      })
      .populate({
        path: 'busRouteId',
        populate: {
          path: 'routeId busId',
          select: 'routeName origin destination registrationNumber',
        },
      })
      .sort({ 'busRouteId.schedule.departureTime': 1 });
  }

  private async getRecentBookings(tripIds: any[], limit: number) {
    return this.bookingModel
      .find({ tripId: { $in: tripIds } })
      .populate('passengerId', 'email profile.firstName profile.lastName')
      .populate({
        path: 'tripId',
        populate: {
          path: 'busRouteId',
          populate: {
            path: 'routeId',
            select: 'routeName origin destination',
          },
        },
      })
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  private async getOwnerRevenueData(
    tripIds: any[],
    dateFilter: { startDate: Date; endDate: Date },
  ) {
    const revenueData = await this.bookingModel.aggregate([
      {
        $match: {
          tripId: { $in: tripIds },
          status: BookingStatus.CONFIRMED,
          'paymentDetails.paymentStatus': 'completed',
          createdAt: { $gte: dateFilter.startDate, $lte: dateFilter.endDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' },
          },
          totalRevenue: { $sum: '$pricing.totalAmount' },
          totalBookings: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]);

    return revenueData;
  }

  private async getBusPerformance(
    busIds: any[],
    dateFilter: { startDate: Date; endDate: Date },
  ) {
    return this.bookingModel.aggregate([
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
        $match: {
          'busRoute.busId': { $in: busIds },
          status: BookingStatus.CONFIRMED,
          createdAt: { $gte: dateFilter.startDate, $lte: dateFilter.endDate },
        },
      },
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
          totalBookings: { $sum: 1 },
          totalRevenue: { $sum: '$pricing.totalAmount' },
          totalSeats: { $first: '$bus.specifications.totalSeats' },
        },
      },
      {
        $addFields: {
          occupancyRate: {
            $multiply: [{ $divide: ['$totalBookings', '$totalSeats'] }, 100],
          },
        },
      },
      { $sort: { totalRevenue: -1 } },
    ]);
  }

  private async getUpcomingTrips(userId: string) {
    const now = new Date();

    return this.bookingModel
      .find({
        passengerId: userId,
        status: BookingStatus.CONFIRMED,
        'journeyDetails.journeyDate': { $gte: now },
      })
      .populate({
        path: 'tripId',
        populate: {
          path: 'busRouteId',
          populate: {
            path: 'routeId busId',
            select: 'routeName origin destination registrationNumber',
          },
        },
      })
      .sort({ 'journeyDetails.journeyDate': 1 })
      .limit(5);
  }

  private async getPassengerRecentBookings(userId: string, limit: number) {
    return this.bookingModel
      .find({ passengerId: userId })
      .populate({
        path: 'tripId',
        populate: {
          path: 'busRouteId',
          populate: {
            path: 'routeId',
            select: 'routeName origin destination',
          },
        },
      })
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  private async getBookingHistory(userId: string) {
    const [total, confirmed, cancelled, completed] = await Promise.all([
      this.bookingModel.countDocuments({ passengerId: userId }),
      this.bookingModel.countDocuments({
        passengerId: userId,
        status: BookingStatus.CONFIRMED,
      }),
      this.bookingModel.countDocuments({
        passengerId: userId,
        status: BookingStatus.CANCELLED,
      }),
      this.bookingModel.countDocuments({
        passengerId: userId,
        status: BookingStatus.COMPLETED,
      }),
    ]);

    return { total, confirmed, cancelled, completed };
  }

  private async getFavoriteRoutes(userId: string, limit: number) {
    return this.bookingModel.aggregate([
      { $match: { passengerId: userId } },
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
          bookingCount: { $sum: 1 },
        },
      },
      { $sort: { bookingCount: -1 } },
      { $limit: limit },
    ]);
  }

  private async getDriverTodaysAssignments(
    userId: string,
    today: Date,
    tomorrow: Date,
  ) {
    return this.busRouteModel
      .find({
        $or: [
          { 'driverAssignment.primaryDriver': userId },
          { 'driverAssignment.secondaryDriver': userId },
        ],
      })
      .populate('busId', 'registrationNumber specifications')
      .populate('routeId', 'routeName origin destination');
  }

  private async getDriverUpcomingTrips(userId: string) {
    const busRoutes = await this.busRouteModel
      .find({
        $or: [
          { 'driverAssignment.primaryDriver': userId },
          { 'driverAssignment.secondaryDriver': userId },
        ],
      })
      .select('_id');

    const busRouteIds = busRoutes.map((br) => br._id);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.tripModel
      .find({
        busRouteId: { $in: busRouteIds },
        tripDate: { $gte: tomorrow },
        tripStatus: { $in: [TripStatus.SCHEDULED] },
      })
      .populate({
        path: 'busRouteId',
        populate: {
          path: 'routeId busId',
          select: 'routeName origin destination registrationNumber',
        },
      })
      .sort({ tripDate: 1 })
      .limit(10);
  }

  private async getDriverCompletedTrips(userId: string, limit: number) {
    const busRoutes = await this.busRouteModel
      .find({
        $or: [
          { 'driverAssignment.primaryDriver': userId },
          { 'driverAssignment.secondaryDriver': userId },
        ],
      })
      .select('_id');

    const busRouteIds = busRoutes.map((br) => br._id);

    return this.tripModel
      .find({
        busRouteId: { $in: busRouteIds },
        tripStatus: TripStatus.COMPLETED,
      })
      .populate({
        path: 'busRouteId',
        populate: {
          path: 'routeId busId',
          select: 'routeName origin destination registrationNumber',
        },
      })
      .sort({ tripDate: -1 })
      .limit(limit);
  }

  private async getDriverStats(userId: string) {
    const busRoutes = await this.busRouteModel
      .find({
        $or: [
          { 'driverAssignment.primaryDriver': userId },
          { 'driverAssignment.secondaryDriver': userId },
        ],
      })
      .select('_id');

    const busRouteIds = busRoutes.map((br) => br._id);

    const [totalTrips, completedTrips, thisMonthTrips] = await Promise.all([
      this.tripModel.countDocuments({ busRouteId: { $in: busRouteIds } }),
      this.tripModel.countDocuments({
        busRouteId: { $in: busRouteIds },
        tripStatus: TripStatus.COMPLETED,
      }),
      this.tripModel.countDocuments({
        busRouteId: { $in: busRouteIds },
        tripDate: {
          $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      }),
    ]);

    return {
      totalTrips,
      completedTrips,
      thisMonthTrips,
      completionRate:
        totalTrips > 0 ? Math.round((completedTrips / totalTrips) * 100) : 0,
    };
  }

  private async getConductorTodaysAssignments(
    userId: string,
    today: Date,
    tomorrow: Date,
  ) {
    return this.busRouteModel
      .find({ 'driverAssignment.conductor': userId })
      .populate('busId', 'registrationNumber specifications')
      .populate('routeId', 'routeName origin destination');
  }

  private async getPassengerManifests(
    userId: string,
    today: Date,
    tomorrow: Date,
  ) {
    const busRoutes = await this.busRouteModel
      .find({ 'driverAssignment.conductor': userId })
      .select('_id');

    const busRouteIds = busRoutes.map((br) => br._id);

    const trips = await this.tripModel
      .find({
        busRouteId: { $in: busRouteIds },
        tripDate: { $gte: today, $lt: tomorrow },
      })
      .populate({
        path: 'busRouteId',
        populate: {
          path: 'routeId',
          select: 'routeName origin destination',
        },
      });

    const tripIds = trips.map((trip) => trip._id);

    const bookings = await this.bookingModel
      .find({
        tripId: { $in: tripIds },
        status: BookingStatus.CONFIRMED,
      })
      .populate('passengerId', 'profile.firstName profile.lastName phone')
      .populate('tripId', 'busRouteId');

    return {
      trips,
      bookings,
      totalPassengers: bookings.reduce(
        (sum, booking) => sum + booking.seatDetails.length,
        0,
      ),
    };
  }

  private async getCollectionSummary(userId: string) {
    const busRoutes = await this.busRouteModel
      .find({ 'driverAssignment.conductor': userId })
      .select('_id');

    const busRouteIds = busRoutes.map((br) => br._id);

    const trips = await this.tripModel
      .find({ busRouteId: { $in: busRouteIds } })
      .select('_id');

    const tripIds = trips.map((trip) => trip._id);

    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const [totalCollection, thisMonthCollection] = await Promise.all([
      this.bookingModel.aggregate([
        {
          $match: {
            tripId: { $in: tripIds },
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
      ]),
      this.bookingModel.aggregate([
        {
          $match: {
            tripId: { $in: tripIds },
            status: BookingStatus.CONFIRMED,
            'paymentDetails.paymentStatus': 'completed',
            createdAt: { $gte: thisMonth },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$pricing.totalAmount' },
          },
        },
      ]),
    ]);

    return {
      totalCollection: totalCollection[0]?.total || 0,
      thisMonthCollection: thisMonthCollection[0]?.total || 0,
    };
  }

  private async getConductorStats(userId: string) {
    const busRoutes = await this.busRouteModel
      .find({ 'driverAssignment.conductor': userId })
      .select('_id');

    const busRouteIds = busRoutes.map((br) => br._id);

    const trips = await this.tripModel
      .find({ busRouteId: { $in: busRouteIds } })
      .select('_id');

    const tripIds = trips.map((trip) => trip._id);

    const [totalTrips, totalPassengers, thisMonthPassengers] =
      await Promise.all([
        this.tripModel.countDocuments({ busRouteId: { $in: busRouteIds } }),
        this.bookingModel.aggregate([
          {
            $match: {
              tripId: { $in: tripIds },
              status: BookingStatus.CONFIRMED,
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: { $size: '$seatDetails' } },
            },
          },
        ]),
        this.bookingModel.aggregate([
          {
            $match: {
              tripId: { $in: tripIds },
              status: BookingStatus.CONFIRMED,
              createdAt: {
                $gte: new Date(
                  new Date().getFullYear(),
                  new Date().getMonth(),
                  1,
                ),
              },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: { $size: '$seatDetails' } },
            },
          },
        ]),
      ]);

    return {
      totalTrips,
      totalPassengers: totalPassengers[0]?.total || 0,
      thisMonthPassengers: thisMonthPassengers[0]?.total || 0,
    };
  }
}
