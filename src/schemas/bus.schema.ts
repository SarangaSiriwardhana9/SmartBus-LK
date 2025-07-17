import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BusDocument = Bus & Document & { _id: Types.ObjectId };

export enum BusType {
  AC = 'ac',
  NON_AC = 'non-ac',
  SEMI_LUXURY = 'semi-luxury',
  LUXURY = 'luxury',
}

export enum BusStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  MAINTENANCE = 'maintenance',
  PENDING_APPROVAL = 'pending_approval',
}

export enum SeatType {
  REGULAR = 'regular',
  VIP = 'vip',
  LADIES = 'ladies',
  DISABLED = 'disabled',
}

@Schema({ _id: false })
export class SeatPosition {
  @Prop({ required: true })
  row: number;

  @Prop({ required: true })
  column: number;
}

@Schema({ _id: false })
export class SeatConfiguration {
  @Prop({ required: true })
  seatNumber: string;

  @Prop({ type: SeatPosition, required: true })
  position: SeatPosition;

  @Prop({ enum: SeatType, default: SeatType.REGULAR })
  type: SeatType;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 1.0 })
  priceMultiplier: number;
}

@Schema({ _id: false })
export class BusLayout {
  @Prop({ default: '2x2' })
  layoutType: string;

  @Prop({ type: [SeatConfiguration], default: [] })
  seatMap: SeatConfiguration[];

  @Prop({ required: true })
  totalRows: number;

  @Prop({ required: true })
  seatsPerRow: number;

  @Prop({ default: 2 })
  aislePosition: number;
}

@Schema({ timestamps: true })
export class Bus {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  ownerId: Types.ObjectId;

  @Prop({ required: true, unique: true })
  registrationNumber: string;

  @Prop({
    type: {
      make: { type: String, required: true },
      model: { type: String, required: true },
      year: { type: Number, required: true },
      engineNumber: String,
      chassisNumber: String,
    },
    required: true,
  })
  busDetails: {
    make: string;
    model: string;
    year: number;
    engineNumber?: string;
    chassisNumber?: string;
  };

  @Prop({
    type: {
      totalSeats: { type: Number, required: true },
      busType: { type: String, enum: BusType, required: true },
      facilities: [String],
    },
    required: true,
  })
  specifications: {
    totalSeats: number;
    busType: BusType;
    facilities: string[];
  };

  @Prop({ type: BusLayout, required: true })
  seatConfiguration: BusLayout;

  @Prop({ type: [String], default: [] })
  documents: string[];

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ enum: BusStatus, default: BusStatus.PENDING_APPROVAL })
  status: BusStatus;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  approvedBy?: Types.ObjectId;

  @Prop()
  approvedAt?: Date;

  @Prop()
  rejectionReason?: string;
}

export const BusSchema = SchemaFactory.createForClass(Bus);

// Indexes for better performance
BusSchema.index({ ownerId: 1 });
BusSchema.index({ registrationNumber: 1 });
BusSchema.index({ status: 1 });
BusSchema.index({ 'specifications.busType': 1 });
