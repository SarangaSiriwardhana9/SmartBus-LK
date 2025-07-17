import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsArray,
  ValidateNested,
  IsOptional,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BusType, SeatType } from '../../schemas/bus.schema';

export class BusDetailsDto {
  @IsString()
  @IsNotEmpty()
  make: string;

  @IsString()
  @IsNotEmpty()
  model: string;

  @IsNumber()
  @Min(1990)
  @Max(new Date().getFullYear() + 1)
  year: number;

  @IsString()
  @IsOptional()
  engineNumber?: string;

  @IsString()
  @IsOptional()
  chassisNumber?: string;
}

export class BusSpecificationsDto {
  @IsNumber()
  @Min(20)
  @Max(56)
  totalSeats: number;

  @IsEnum(BusType)
  busType: BusType;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  facilities?: string[];
}

export class SeatPositionDto {
  @IsNumber()
  @Min(1)
  row: number;

  @IsNumber()
  @Min(1)
  column: number;
}

export class SeatConfigurationDto {
  @IsString()
  @IsNotEmpty()
  seatNumber: string;

  @ValidateNested()
  @Type(() => SeatPositionDto)
  position: SeatPositionDto;

  @IsEnum(SeatType)
  @IsOptional()
  type?: SeatType;

  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @Min(0.5)
  @Max(3.0)
  @IsOptional()
  priceMultiplier?: number;
}

export class BusLayoutDto {
  @IsString()
  @IsOptional()
  layoutType?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SeatConfigurationDto)
  seatMap: SeatConfigurationDto[];

  @IsNumber()
  @Min(1)
  totalRows: number;

  @IsNumber()
  @Min(2)
  @Max(6)
  seatsPerRow: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  aislePosition?: number;
}

export class CreateBusDto {
  @IsString()
  @IsNotEmpty()
  registrationNumber: string;

  @ValidateNested()
  @Type(() => BusDetailsDto)
  busDetails: BusDetailsDto;

  @ValidateNested()
  @Type(() => BusSpecificationsDto)
  specifications: BusSpecificationsDto;

  @ValidateNested()
  @Type(() => BusLayoutDto)
  seatConfiguration: BusLayoutDto;
}
