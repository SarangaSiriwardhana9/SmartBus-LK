import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { Booking, BookingSchema } from '../schemas/booking.schema';
import { Trip, TripSchema } from '../schemas/trip.schema';
import { BusRoute, BusRouteSchema } from '../schemas/bus-route.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Booking.name, schema: BookingSchema },
      { name: Trip.name, schema: TripSchema },
      { name: BusRoute.name, schema: BusRouteSchema },
    ]),
  ],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
