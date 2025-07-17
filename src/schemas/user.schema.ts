import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User &
  Document & {
    _id: Types.ObjectId;
  };

export enum UserRole {
  ADMIN = 'admin',
  BUS_OWNER = 'bus_owner',
  DRIVER = 'driver',
  CONDUCTOR = 'conductor',
  PASSENGER = 'passenger',
}

export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({ required: true, enum: UserRole })
  role: UserRole;

  @Prop({
    type: {
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      phone: { type: String, required: true },
      dateOfBirth: { type: Date },
      gender: { type: String, enum: ['male', 'female', 'other'] },
      address: {
        street: String,
        city: String,
        province: String,
        postalCode: String,
        country: { type: String, default: 'Sri Lanka' },
      },
      profilePicture: String,
    },
  })
  profile: {
    firstName: string;
    lastName: string;
    phone: string;
    dateOfBirth?: Date;
    gender?: string;
    address?: {
      street?: string;
      city?: string;
      province?: string;
      postalCode?: string;
      country?: string;
    };
    profilePicture?: string;
  };

  @Prop({
    type: {
      emailVerified: { type: Boolean, default: false },
      phoneVerified: { type: Boolean, default: false },
      documentsVerified: { type: Boolean, default: false },
    },
    default: {},
  })
  verification: {
    emailVerified: boolean;
    phoneVerified: boolean;
    documentsVerified: boolean;
  };

  @Prop({ enum: UserStatus, default: UserStatus.PENDING })
  status: UserStatus;

  @Prop({ select: false })
  refreshToken?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Index for better query performance
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ status: 1 });
