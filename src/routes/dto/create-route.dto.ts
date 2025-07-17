import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsOptional,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export class LocationDto {
  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  station: string;

  @IsArray()
  @IsNumber({}, { each: true })
  coordinates: number[]; // [longitude, latitude]
}

export class IntermediateStopDto {
  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  station: string;

  @IsArray()
  @IsNumber({}, { each: true })
  coordinates: number[];

  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'arrivalTime must be in HH:MM format',
  })
  arrivalTime: string;

  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'departureTime must be in HH:MM format',
  })
  departureTime: string;

  @IsNumber()
  @Min(0)
  distanceFromOrigin: number;

  @IsNumber()
  @Min(0)
  fareFromOrigin: number;

  @IsNumber()
  @Min(5)
  @Max(60)
  @IsOptional()
  stopDuration?: number;
}

export class CreateRouteDto {
  @IsString()
  @IsNotEmpty()
  routeName: string;

  @ValidateNested()
  @Type(() => LocationDto)
  origin: LocationDto;

  @ValidateNested()
  @Type(() => LocationDto)
  destination: LocationDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IntermediateStopDto)
  @IsOptional()
  intermediateStops?: IntermediateStopDto[];

  @IsNumber()
  @Min(1)
  totalDistance: number;

  @IsNumber()
  @Min(30)
  estimatedDuration: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  popularTimes?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  operatingDays?: string[];
}
