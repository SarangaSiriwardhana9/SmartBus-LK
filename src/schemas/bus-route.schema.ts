import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BusRouteDocument = BusRoute & Document & { _id: Types.ObjectId };

export enum FrequencyType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  CUSTOM = 'custom',
}

export enum BusRouteStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  MAINTENANCE = 'maintenance',
}

@Schema({ _id: false })
export class Schedule {
  @Prop({ required: true })
  departureTime: string; // "06:00"

  @Prop({ required: true })
  arrivalTime: string; // "12:00"

  @Prop({ enum: FrequencyType, default: FrequencyType.DAILY })
  frequency: FrequencyType;

  @Prop({ type: [Number], default: [1, 2, 3, 4, 5, 6, 0] }) // 0=Sunday, 1=Monday, etc.
  operatingDays: number[];

  @Prop({ required: true })
  effectiveFrom: Date;

  @Prop({ required: true })
  effectiveTo: Date;
}

@Schema({ _id: false })
export class Pricing {
  @Prop({ required: true })
  baseFare: number; // Base fare in LKR

  @Prop({ default: 2.5 })
  farePerKm: number; // Per km rate

  @Prop({ default: false })
  dynamicPricing: boolean;

  @Prop({ default: 1.0 })
  peakHourMultiplier: number;

  @Prop({ default: 1.0 })
  weekendMultiplier: number;

  @Prop({ default: 1.0 })
  holidayMultiplier: number;
}

@Schema({ _id: false })
export class DriverAssignment {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  primaryDriver?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  secondaryDriver?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  conductor?: Types.ObjectId;
}

@Schema({ timestamps: true })
export class BusRoute {
  @Prop({ type: Types.ObjectId, ref: 'Bus', required: true })
  busId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Route', required: true })
  routeId: Types.ObjectId;

  @Prop({ type: Schedule, required: true })
  schedule: Schedule;

  @Prop({ type: Pricing, required: true })
  pricing: Pricing;

  @Prop({ type: DriverAssignment })
  driverAssignment?: DriverAssignment;

  @Prop({ enum: BusRouteStatus, default: BusRouteStatus.ACTIVE })
  status: BusRouteStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: [String], default: [] })
  specialNotes: string[];
}

export const BusRouteSchema = SchemaFactory.createForClass(BusRoute);

// Indexes
BusRouteSchema.index({ busId: 1, routeId: 1 }, { unique: true });
BusRouteSchema.index({ routeId: 1 });
BusRouteSchema.index({ busId: 1 });
BusRouteSchema.index({ status: 1 });
BusRouteSchema.index({ createdBy: 1 });
