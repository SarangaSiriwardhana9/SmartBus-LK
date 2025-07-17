import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TripDocument = Trip & Document & { _id: Types.ObjectId };

export enum TripStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  DELAYED = 'delayed',
}

@Schema({ _id: false })
export class CurrentLocation {
  @Prop({ type: [Number], required: true }) // [longitude, latitude]
  coordinates: number[];

  @Prop({ default: Date.now })
  lastUpdated: Date;

  @Prop({ default: 0 })
  speed: number;

  @Prop()
  nextStop?: string;
}

@Schema({ _id: false })
export class SeatAvailability {
  @Prop({ required: true })
  seatNumber: string;

  @Prop({ default: false })
  isBooked: boolean;

  @Prop({ type: Types.ObjectId, ref: 'Booking' })
  bookingId?: Types.ObjectId;
}

@Schema({ _id: false })
export class TripMetrics {
  @Prop({ default: 0 })
  totalRevenue: number;

  @Prop({ default: 0 })
  totalPassengers: number;

  @Prop({ default: 0 })
  occupancyRate: number;

  @Prop({ default: true })
  onTimePerformance: boolean;
}

@Schema({ timestamps: true })
export class Trip {
  @Prop({ type: Types.ObjectId, ref: 'BusRoute', required: true })
  busRouteId: Types.ObjectId;

  @Prop({ required: true })
  tripDate: Date;

  @Prop({ enum: TripStatus, default: TripStatus.SCHEDULED })
  tripStatus: TripStatus;

  @Prop()
  actualDeparture?: Date;

  @Prop()
  actualArrival?: Date;

  @Prop({ type: CurrentLocation })
  currentLocation?: CurrentLocation;

  @Prop({ type: [SeatAvailability], default: [] })
  seatAvailability: SeatAvailability[];

  @Prop({ type: TripMetrics, default: {} })
  tripMetrics: TripMetrics;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;
}

export const TripSchema = SchemaFactory.createForClass(Trip);

// Indexes
TripSchema.index({ busRouteId: 1, tripDate: 1 });
TripSchema.index({ tripStatus: 1 });
TripSchema.index({ tripDate: 1 });
TripSchema.index({ createdBy: 1 });
