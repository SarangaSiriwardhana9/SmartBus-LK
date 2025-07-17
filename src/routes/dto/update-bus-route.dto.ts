import { PartialType } from '@nestjs/mapped-types';
import { CreateBusRouteDto } from './create-bus-route.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { BusRouteStatus } from '../../schemas/bus-route.schema';

export class UpdateBusRouteDto extends PartialType(CreateBusRouteDto) {
  @IsEnum(BusRouteStatus)
  @IsOptional()
  status?: BusRouteStatus;
}
