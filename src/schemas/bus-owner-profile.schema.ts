import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BusOwnerProfileDocument = BusOwnerProfile &
  Document & { _id: Types.ObjectId };

export enum VerificationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Schema({ timestamps: true })
export class BusOwnerProfile {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  businessName: string;

  @Prop({ required: true })
  businessLicense: string;

  @Prop()
  taxId?: string;

  @Prop({
    type: {
      bankName: String,
      accountNumber: String,
      accountHolderName: String,
      branchCode: String,
    },
  })
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    accountHolderName: string;
    branchCode: string;
  };

  @Prop({ type: [String], default: [] })
  documents: string[];

  @Prop({ enum: VerificationStatus, default: VerificationStatus.PENDING })
  verificationStatus: VerificationStatus;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  approvedBy?: Types.ObjectId;

  @Prop()
  rejectionReason?: string;
}

export const BusOwnerProfileSchema =
  SchemaFactory.createForClass(BusOwnerProfile);

// Indexes
BusOwnerProfileSchema.index({ userId: 1 });
BusOwnerProfileSchema.index({ verificationStatus: 1 });
