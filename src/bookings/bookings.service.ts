/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Booking,
  BookingDocument,
  BookingStatus,
  PaymentStatus,
} from '../schemas/booking.schema';
import { Trip, TripDocument, TripStatus } from '../schemas/trip.schema';
import { BusRoute, BusRouteDocument } from '../schemas/bus-route.schema';
import { BusDocument } from '../schemas/bus.schema';

import { UserDocument, UserRole } from '../schemas/user.schema';
import { CreateBookingDto } from './dto/create-booking.dto';

import { SearchTripsDto } from './dto/search-trips.dto';
import { CreateTripDto } from './dto/create-trip.dto';

// Type for populated BusRoute
interface PopulatedBusRoute extends Omit<BusRouteDocument, 'busId'> {
  busId: BusDocument;
}

// Type for populated Trip
interface PopulatedTrip extends Omit<TripDocument, 'busRouteId'> {
  busRouteId: PopulatedBusRoute;
}

@Injectable()
export class BookingsService {
  constructor(
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    @InjectModel(Trip.name) private tripModel: Model<TripDocument>,
    @InjectModel(BusRoute.name) private busRouteModel: Model<BusRouteDocument>,
  ) {}

  // Trip Management
  async createTrip(createTripDto: CreateTripDto, user: UserDocument) {
    // Verify bus route exists and user has permission
    const busRoute = (await this.busRouteModel
      .findById(createTripDto.busRouteId)
      .populate('busId')) as unknown as PopulatedBusRoute;

    if (!busRoute) {
      throw new NotFoundException('Bus route not found');
    }

    // Check if user has permission (admin or bus owner)
    if (
      user.role !== UserRole.ADMIN &&
      (user.role !== UserRole.BUS_OWNER ||
        busRoute.busId.ownerId.toString() !== user._id.toString())
    ) {
      throw new ForbiddenException(
        'Access denied to create trip for this bus route',
      );
    }

    // Check if trip already exists for this date
    const existingTrip = await this.tripModel.findOne({
      busRouteId: new Types.ObjectId(createTripDto.busRouteId),
      tripDate: new Date(createTripDto.tripDate),
    });

    if (existingTrip) {
      throw new ConflictException('Trip already exists for this date');
    }

    // Initialize seat availability based on bus configuration
    const totalSeats = busRoute.busId.specifications?.totalSeats || 0;
    const seatAvailability =
      totalSeats > 0
        ? Array.from({ length: totalSeats }, (_, i) => ({
            seatNumber: (i + 1).toString(),
            isBooked: false,
          }))
        : [];

    const trip = new this.tripModel({
      busRouteId: new Types.ObjectId(createTripDto.busRouteId),
      tripDate: new Date(createTripDto.tripDate),
      tripStatus: createTripDto.tripStatus || TripStatus.SCHEDULED,
      seatAvailability,
      createdBy: user._id,
    });

    await trip.save();

    return {
      message: 'Trip created successfully',
      trip: trip.toObject(),
    };
  }

  async searchTrips(searchTripsDto: SearchTripsDto) {
    const {
      originCity,
      destinationCity,
      journeyDate,
      journeyTime,
      busType,
      passengerCount = 1,
    } = searchTripsDto;

    // Build aggregation pipeline
    const pipeline: any[] = [
      // Match trips for the specified date
      {
        $match: {
          tripDate: new Date(journeyDate),
          tripStatus: { $in: [TripStatus.SCHEDULED, TripStatus.IN_PROGRESS] },
        },
      },
      // Lookup bus route details
      {
        $lookup: {
          from: 'busroutes',
          localField: 'busRouteId',
          foreignField: '_id',
          as: 'busRoute',
        },
      },
      { $unwind: '$busRoute' },
      // Lookup route details
      {
        $lookup: {
          from: 'routes',
          localField: 'busRoute.routeId',
          foreignField: '_id',
          as: 'route',
        },
      },
      { $unwind: '$route' },
      // Lookup bus details
      {
        $lookup: {
          from: 'buses',
          localField: 'busRoute.busId',
          foreignField: '_id',
          as: 'bus',
        },
      },
      { $unwind: '$bus' },
      // Match origin and destination cities
      {
        $match: {
          'route.origin.city': { $regex: originCity, $options: 'i' },
          'route.destination.city': { $regex: destinationCity, $options: 'i' },
        },
      },
    ];

    // Add bus type filter if specified
    if (busType) {
      pipeline.push({
        $match: { 'bus.specifications.busType': busType },
      });
    }

    // Add journey time filter if specified
    if (journeyTime) {
      pipeline.push({
        $match: { 'busRoute.schedule.departureTime': journeyTime },
      });
    }

    // Add available seats calculation
    pipeline.push({
      $addFields: {
        availableSeats: {
          $size: {
            $filter: {
              input: '$seatAvailability',
              cond: { $eq: ['$$this.isBooked', false] },
            },
          },
        },
      },
    });

    // Filter trips with enough available seats
    pipeline.push({
      $match: { availableSeats: { $gte: passengerCount } },
    });

    // Sort by departure time
    pipeline.push({
      $sort: { 'busRoute.schedule.departureTime': 1 },
    });

    const trips = await this.tripModel.aggregate(pipeline);

    return {
      trips,
      count: trips.length,
      searchCriteria: searchTripsDto,
    };
  }

  async getTripSeatAvailability(tripId: string) {
    const trip = (await this.tripModel.findById(tripId).populate({
      path: 'busRouteId',
      populate: {
        path: 'busId',
        select: 'seatConfiguration specifications',
      },
    })) as unknown as PopulatedTrip;

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    return {
      tripId,
      seatAvailability: trip.seatAvailability,
      seatConfiguration: trip.busRouteId.busId.seatConfiguration,
      totalSeats: trip.busRouteId.busId.specifications.totalSeats,
    };
  }

  // Booking Management
  async createBooking(createBookingDto: CreateBookingDto, user: UserDocument) {
    const { tripId, seatDetails, journeyDetails, paymentDetails } =
      createBookingDto;

    // Verify trip exists
    const trip = (await this.tripModel.findById(tripId).populate({
      path: 'busRouteId',
      populate: {
        path: 'routeId busId',
      },
    })) as unknown as PopulatedTrip;

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    // Check if trip is bookable
    if (trip.tripStatus !== TripStatus.SCHEDULED) {
      throw new BadRequestException('Trip is not available for booking');
    }

    // Verify seat availability
    const requestedSeats = seatDetails.map((seat) => seat.seatNumber);
    const unavailableSeats = trip.seatAvailability.filter(
      (seat) => requestedSeats.includes(seat.seatNumber) && seat.isBooked,
    );

    if (unavailableSeats.length > 0) {
      throw new ConflictException(
        `Seats ${unavailableSeats.map((s) => s.seatNumber).join(', ')} are already booked`,
      );
    }

    // Generate booking reference
    const bookingReference = this.generateBookingReference();

    // Calculate pricing
    const pricing = this.calculatePricing(trip, seatDetails.length);

    // Create booking
    const booking = new this.bookingModel({
      bookingReference,
      passengerId: user._id,
      tripId: new Types.ObjectId(tripId),
      seatDetails,
      journeyDetails: {
        ...journeyDetails,
        journeyDate: new Date(journeyDetails.journeyDate),
      },
      pricing,
      paymentDetails: {
        ...paymentDetails,
        paymentStatus: PaymentStatus.PENDING,
      },
      status: BookingStatus.CONFIRMED,
    });

    // Update seat availability in trip
    trip.seatAvailability.forEach((seat) => {
      if (requestedSeats.includes(seat.seatNumber)) {
        seat.isBooked = true;
        seat.bookingId = booking._id;
      }
    });

    // Save both booking and trip
    await Promise.all([booking.save(), trip.save()]);

    // Simulate payment processing
    await this.processPayment(booking._id.toString());

    return {
      message: 'Booking created successfully',
      booking: booking.toObject(),
      bookingReference,
    };
  }

  async findAllBookings(
    user: UserDocument,
    page: number = 1,
    limit: number = 10,
    status?: BookingStatus,
  ) {
    const skip = (page - 1) * limit;
    const filter: any = {};

    // Role-based filtering
    if (user.role === UserRole.PASSENGER) {
      filter.passengerId = user._id;
    } else if (user.role === UserRole.BUS_OWNER) {
      // Get bookings for trips from user's buses
      const userBusRoutes = await this.busRouteModel.find({
        createdBy: user._id,
      });
      const tripIds = await this.tripModel
        .find({ busRouteId: { $in: userBusRoutes.map((br) => br._id) } })
        .distinct('_id');
      filter.tripId = { $in: tripIds };
    }

    if (status) {
      filter.status = status;
    }

    const [bookings, total] = await Promise.all([
      this.bookingModel
        .find(filter)
        .populate('passengerId', 'email profile.firstName profile.lastName')
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
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      this.bookingModel.countDocuments(filter),
    ]);

    return {
      bookings,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findBookingById(id: string, user: UserDocument) {
    const booking = await this.bookingModel
      .findById(id)
      .populate('passengerId', 'email profile.firstName profile.lastName')
      .populate({
        path: 'tripId',
        populate: {
          path: 'busRouteId',
          populate: {
            path: 'routeId busId',
          },
        },
      });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Check permissions
    if (
      user.role === UserRole.PASSENGER &&
      booking.passengerId._id.toString() !== user._id.toString()
    ) {
      throw new ForbiddenException('Access denied to this booking');
    }

    return booking;
  }

  async cancelBooking(id: string, user: UserDocument, reason?: string) {
    const booking = await this.findBookingById(id, user);

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException('Only confirmed bookings can be cancelled');
    }

    // Check cancellation policy (e.g., must be cancelled before trip date)
    const tripDate = booking.journeyDetails.journeyDate;
    const now = new Date();
    if (tripDate <= now) {
      throw new BadRequestException('Cannot cancel booking after trip date');
    }

    // Update booking status
    booking.status = BookingStatus.CANCELLED;
    booking.cancellationReason = reason;

    // Update payment status for refund
    booking.paymentDetails.paymentStatus = PaymentStatus.REFUNDED;
    booking.paymentDetails.refundedAt = new Date();
    booking.paymentDetails.refundAmount = booking.pricing.totalAmount;

    // Free up seats in trip
    const trip = await this.tripModel.findById(booking.tripId);
    if (trip) {
      const bookedSeats = booking.seatDetails.map((seat) => seat.seatNumber);
      trip.seatAvailability.forEach((seat) => {
        if (bookedSeats.includes(seat.seatNumber)) {
          seat.isBooked = false;
          seat.bookingId = undefined;
        }
      });
      await trip.save();
    }

    await booking.save();

    return {
      message: 'Booking cancelled successfully',
      booking: booking.toObject(),
    };
  }

  // Helper methods
  private generateBookingReference(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `BMS${timestamp.slice(-6)}${random}`;
  }

  private calculatePricing(trip: PopulatedTrip, seatCount: number) {
    const baseFare = trip.busRouteId.pricing.baseFare;
    const priceMultiplier = trip.busRouteId.pricing.peakHourMultiplier || 1.0;

    const subtotal = baseFare * seatCount * priceMultiplier;
    const taxes = subtotal * 0.1; // 10% tax
    const totalAmount = subtotal + taxes;

    return {
      baseFare,
      taxes,
      discount: 0,
      totalAmount,
      priceMultiplier,
    };
  }

  private async processPayment(bookingId: string) {
    // Simulate payment processing
    const booking = await this.bookingModel.findById(bookingId);
    if (booking) {
      // Generate transaction ID
      booking.paymentDetails.transactionId = `TXN${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      booking.paymentDetails.paymentStatus = PaymentStatus.COMPLETED;
      booking.paymentDetails.paidAt = new Date();
      await booking.save();
    }
  }
}
