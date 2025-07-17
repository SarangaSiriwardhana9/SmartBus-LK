import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BookingDocument = Booking & Document & { _id: Types.ObjectId };

export enum BookingStatus {
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  NO_SHOW = 'no-show',
  REFUNDED = 'refunded',
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum PaymentMethod {
  CARD = 'card',
  CASH = 'cash',
  DIGITAL_WALLET = 'digital_wallet',
}

@Schema({ _id: false })
export class SeatDetail {
  @Prop({ required: true })
  seatNumber: string;

  @Prop({ required: true })
  passengerName: string;

  @Prop({ required: true })
  passengerAge: number;

  @Prop({ required: true, enum: ['male', 'female', 'other'] })
  passengerGender: string;

  @Prop()
  passengerIdType?: string;

  @Prop()
  passengerIdNumber?: string;

  @Prop({ default: false })
  isBoarded: boolean;
}

@Schema({ _id: false })
export class JourneyDetails {
  @Prop({ required: true })
  boardingPoint: string;

  @Prop({ required: true })
  droppingPoint: string;

  @Prop({ required: true })
  journeyDate: Date;

  @Prop({ required: true })
  journeyTime: string;
}

@Schema({ _id: false })
export class PricingDetails {
  @Prop({ required: true })
  baseFare: number;

  @Prop({ default: 0 })
  taxes: number;

  @Prop({ default: 0 })
  discount: number;

  @Prop({ required: true })
  totalAmount: number;

  @Prop({ default: 1.0 })
  priceMultiplier: number;
}

@Schema({ _id: false })
export class PaymentDetails {
  @Prop({ enum: PaymentMethod, required: true })
  paymentMethod: PaymentMethod;

  @Prop({ enum: PaymentStatus, default: PaymentStatus.PENDING })
  paymentStatus: PaymentStatus;

  @Prop()
  transactionId?: string;

  @Prop()
  paidAt?: Date;

  @Prop()
  refundedAt?: Date;

  @Prop()
  refundAmount?: number;
}

@Schema({ timestamps: true })
export class Booking {
  @Prop({ required: true, unique: true })
  bookingReference: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  passengerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Trip', required: true })
  tripId: Types.ObjectId;

  @Prop({ type: [SeatDetail], required: true })
  seatDetails: SeatDetail[];

  @Prop({ type: JourneyDetails, required: true })
  journeyDetails: JourneyDetails;

  @Prop({ type: PricingDetails, required: true })
  pricing: PricingDetails;

  @Prop({ type: PaymentDetails, required: true })
  paymentDetails: PaymentDetails;

  @Prop({ enum: BookingStatus, default: BookingStatus.CONFIRMED })
  status: BookingStatus;

  @Prop()
  cancellationReason?: string;

  @Prop()
  specialRequirements?: string;
}

export const BookingSchema = SchemaFactory.createForClass(Booking);

// Indexes
BookingSchema.index({ bookingReference: 1 });
BookingSchema.index({ passengerId: 1 });
BookingSchema.index({ tripId: 1 });
BookingSchema.index({ status: 1 });
BookingSchema.index({ 'journeyDetails.journeyDate': 1 });
BookingSchema.index({ 'paymentDetails.paymentStatus': 1 });
