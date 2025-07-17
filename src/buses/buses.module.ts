/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BusesService } from './buses.service';
import { BusesController } from './buses.controller';
import { Bus, BusSchema } from '../schemas/bus.schema';
import {
  BusOwnerProfile,
  BusOwnerProfileSchema,
} from '../schemas/bus-owner-profile.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Bus.name, schema: BusSchema },
      { name: BusOwnerProfile.name, schema: BusOwnerProfileSchema },
    ]),
  ],
  controllers: [BusesController],
  providers: [BusesService],
  exports: [BusesService],
})
export class BusesModule {}
