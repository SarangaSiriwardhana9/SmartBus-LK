import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsOptional,
  IsEnum,
  IsDateString,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FrequencyType } from '../../schemas/bus-route.schema';

export class ScheduleDto {
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'departureTime must be in HH:MM format',
  })
  departureTime: string;

  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'arrivalTime must be in HH:MM format',
  })
  arrivalTime: string;

  @IsEnum(FrequencyType)
  @IsOptional()
  frequency?: FrequencyType;

  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  operatingDays?: number[];

  @IsDateString()
  effectiveFrom: string;

  @IsDateString()
  effectiveTo: string;
}

export class PricingDto {
  @IsNumber()
  @Min(0)
  baseFare: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  farePerKm?: number;

  @IsBoolean()
  @IsOptional()
  dynamicPricing?: boolean;

  @IsNumber()
  @Min(0.5)
  @Max(3.0)
  @IsOptional()
  peakHourMultiplier?: number;

  @IsNumber()
  @Min(0.5)
  @Max(3.0)
  @IsOptional()
  weekendMultiplier?: number;

  @IsNumber()
  @Min(0.5)
  @Max(3.0)
  @IsOptional()
  holidayMultiplier?: number;
}

export class DriverAssignmentDto {
  @IsString()
  @IsOptional()
  primaryDriver?: string;

  @IsString()
  @IsOptional()
  secondaryDriver?: string;

  @IsString()
  @IsOptional()
  conductor?: string;
}

export class CreateBusRouteDto {
  @IsString()
  @IsNotEmpty()
  busId: string;

  @IsString()
  @IsNotEmpty()
  routeId: string;

  @ValidateNested()
  @Type(() => ScheduleDto)
  schedule: ScheduleDto;

  @ValidateNested()
  @Type(() => PricingDto)
  pricing: PricingDto;

  @ValidateNested()
  @Type(() => DriverAssignmentDto)
  @IsOptional()
  driverAssignment?: DriverAssignmentDto;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  specialNotes?: string[];
}
