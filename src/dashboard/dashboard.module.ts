import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { User, UserSchema } from '../schemas/user.schema';
import { Bus, BusSchema } from '../schemas/bus.schema';
import { Route, RouteSchema } from '../schemas/route.schema';
import { BusRoute, BusRouteSchema } from '../schemas/bus-route.schema';
import { Booking, BookingSchema } from '../schemas/booking.schema';
import { Trip, TripSchema } from '../schemas/trip.schema';
import {
  BusOwnerProfile,
  BusOwnerProfileSchema,
} from '../schemas/bus-owner-profile.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Bus.name, schema: BusSchema },
      { name: Route.name, schema: RouteSchema },
      { name: BusRoute.name, schema: BusRouteSchema },
      { name: Booking.name, schema: BookingSchema },
      { name: Trip.name, schema: TripSchema },
      { name: BusOwnerProfile.name, schema: BusOwnerProfileSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
