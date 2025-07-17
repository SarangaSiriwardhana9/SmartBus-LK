import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RoutesService } from './routes.service';
import { RoutesController } from './routes.controller';
import { Route, RouteSchema } from '../schemas/route.schema';
import { BusRoute, BusRouteSchema } from '../schemas/bus-route.schema';
import { Bus, BusSchema } from '../schemas/bus.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Route.name, schema: RouteSchema },
      { name: BusRoute.name, schema: BusRouteSchema },
      { name: Bus.name, schema: BusSchema },
    ]),
  ],
  controllers: [RoutesController],
  providers: [RoutesService],
  exports: [RoutesService],
})
export class RoutesModule {}
