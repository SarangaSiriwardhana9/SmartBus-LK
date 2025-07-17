import {
  IsOptional,
  IsDateString,
  IsEnum,
  IsNumber,
  Min,
} from 'class-validator';

export enum DateRange {
  TODAY = 'today',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
  CUSTOM = 'custom',
}

export class DashboardFilterDto {
  @IsEnum(DateRange)
  @IsOptional()
  dateRange?: DateRange;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  limit?: number;
}
