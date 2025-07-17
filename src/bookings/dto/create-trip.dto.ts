import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { TripStatus } from '../../schemas/trip.schema';

export class CreateTripDto {
  @IsString()
  @IsNotEmpty()
  busRouteId: string;

  @IsDateString()
  tripDate: string;

  @IsEnum(TripStatus)
  @IsOptional()
  tripStatus?: TripStatus;
}
