import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { Booking, BookingSchema } from '../schemas/booking.schema';
import { Trip, TripSchema } from '../schemas/trip.schema';
import { Bus, BusSchema } from '../schemas/bus.schema';
import { Route, RouteSchema } from '../schemas/route.schema';
import { BusRoute, BusRouteSchema } from '../schemas/bus-route.schema';
import { User, UserSchema } from '../schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Booking.name, schema: BookingSchema },
      { name: Trip.name, schema: TripSchema },
      { name: Bus.name, schema: BusSchema },
      { name: Route.name, schema: RouteSchema },
      { name: BusRoute.name, schema: BusRouteSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
