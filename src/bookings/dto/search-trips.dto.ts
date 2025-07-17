import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
} from 'class-validator';
import { BusType } from '../../schemas/bus.schema';

export class SearchTripsDto {
  @IsString()
  @IsNotEmpty()
  originCity: string;

  @IsString()
  @IsNotEmpty()
  destinationCity: string;

  @IsDateString()
  journeyDate: string;

  @IsString()
  @IsOptional()
  journeyTime?: string;

  @IsEnum(BusType)
  @IsOptional()
  busType?: BusType;

  @IsNumber()
  @Min(1)
  @IsOptional()
  passengerCount?: number;
}
