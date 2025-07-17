import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RouteDocument = Route & Document & { _id: Types.ObjectId };

@Schema({ _id: false })
export class Location {
  @Prop({ required: true })
  city: string;

  @Prop({ required: true })
  station: string;

  @Prop({ type: [Number], required: true }) // [longitude, latitude]
  coordinates: number[];
}

@Schema({ _id: false })
export class IntermediateStop {
  @Prop({ required: true })
  city: string;

  @Prop({ required: true })
  station: string;

  @Prop({ type: [Number], required: true })
  coordinates: number[];

  @Prop({ required: true })
  arrivalTime: string; // "14:30"

  @Prop({ required: true })
  departureTime: string; // "14:45"

  @Prop({ required: true })
  distanceFromOrigin: number; // in km

  @Prop({ required: true })
  fareFromOrigin: number; // in LKR

  @Prop({ default: 10 })
  stopDuration: number; // in minutes
}

@Schema({ timestamps: true })
export class Route {
  @Prop({ required: true })
  routeName: string;

  @Prop({ type: Location, required: true })
  origin: Location;

  @Prop({ type: Location, required: true })
  destination: Location;

  @Prop({ type: [IntermediateStop], default: [] })
  intermediateStops: IntermediateStop[];

  @Prop({ required: true })
  totalDistance: number; // in km

  @Prop({ required: true })
  estimatedDuration: number; // in minutes

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: [String], default: [] })
  popularTimes: string[]; // ["06:00", "18:00"]

  @Prop({ type: [String], default: [] })
  operatingDays: string[]; // ["monday", "tuesday", ...]
}

export const RouteSchema = SchemaFactory.createForClass(Route);

// Indexes for better performance
RouteSchema.index({ 'origin.city': 1, 'destination.city': 1 });
RouteSchema.index({ isActive: 1 });
RouteSchema.index({ createdBy: 1 });
RouteSchema.index({ routeName: 1 });
