import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsNumber,
  IsEnum,
  IsOptional,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '../../schemas/booking.schema';

export class SeatDetailDto {
  @IsString()
  @IsNotEmpty()
  seatNumber: string;

  @IsString()
  @IsNotEmpty()
  passengerName: string;

  @IsNumber()
  @Min(1)
  @Max(120)
  passengerAge: number;

  @IsEnum(['male', 'female', 'other'])
  passengerGender: string;

  @IsString()
  @IsOptional()
  passengerIdType?: string;

  @IsString()
  @IsOptional()
  passengerIdNumber?: string;
}

export class JourneyDetailsDto {
  @IsString()
  @IsNotEmpty()
  boardingPoint: string;

  @IsString()
  @IsNotEmpty()
  droppingPoint: string;

  @IsDateString()
  journeyDate: string;

  @IsString()
  @IsNotEmpty()
  journeyTime: string;
}

export class PaymentDetailsDto {
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsString()
  @IsOptional()
  cardNumber?: string;

  @IsString()
  @IsOptional()
  expiryDate?: string;

  @IsString()
  @IsOptional()
  cvv?: string;

  @IsString()
  @IsOptional()
  cardHolderName?: string;
}

export class CreateBookingDto {
  @IsString()
  @IsNotEmpty()
  tripId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SeatDetailDto)
  seatDetails: SeatDetailDto[];

  @ValidateNested()
  @Type(() => JourneyDetailsDto)
  journeyDetails: JourneyDetailsDto;

  @ValidateNested()
  @Type(() => PaymentDetailsDto)
  paymentDetails: PaymentDetailsDto;

  @IsString()
  @IsOptional()
  specialRequirements?: string;
}
