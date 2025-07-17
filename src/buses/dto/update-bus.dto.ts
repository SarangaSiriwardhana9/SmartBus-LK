import { PartialType } from '@nestjs/mapped-types';
import { CreateBusDto } from './create-bus.dto';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { BusStatus } from '../../schemas/bus.schema';

export class UpdateBusDto extends PartialType(CreateBusDto) {
  @IsEnum(BusStatus)
  @IsOptional()
  status?: BusStatus;

  @IsString()
  @IsOptional()
  rejectionReason?: string;
}
