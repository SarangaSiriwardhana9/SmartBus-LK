import {
  IsOptional,
  IsDateString,
  IsEnum,
  IsString,
  IsArray,
} from 'class-validator';

export enum ReportType {
  REVENUE = 'revenue',
  BOOKINGS = 'bookings',
  PERFORMANCE = 'performance',
  OCCUPANCY = 'occupancy',
}

export enum ReportPeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  CUSTOM = 'custom',
}

export class ReportFilterDto {
  @IsEnum(ReportType)
  @IsOptional()
  reportType?: ReportType;

  @IsEnum(ReportPeriod)
  @IsOptional()
  period?: ReportPeriod;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  busOwnerId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  busIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  routeIds?: string[];
}
