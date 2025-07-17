import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { BusesService } from './buses.service';
import { CreateBusDto } from './dto/create-bus.dto';
import { UpdateBusDto } from './dto/update-bus.dto';
import { CreateBusOwnerProfileDto } from './dto/bus-owner-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserDocument, UserRole } from '../schemas/user.schema';
import { BusStatus } from '../schemas/bus.schema';

@Controller('buses')
@UseGuards(JwtAuthGuard)
export class BusesController {
  constructor(private readonly busesService: BusesService) {}

  // Bus Owner Profile Endpoints
  @Post('owner/profile')
  @UseGuards(RolesGuard)
  @Roles(UserRole.BUS_OWNER)
  createBusOwnerProfile(
    @CurrentUser() user: UserDocument,
    @Body() createBusOwnerProfileDto: CreateBusOwnerProfileDto,
  ) {
    return this.busesService.createBusOwnerProfile(
      user._id.toString(),
      createBusOwnerProfileDto,
    );
  }

  @Get('owner/profile')
  @UseGuards(RolesGuard)
  @Roles(UserRole.BUS_OWNER, UserRole.ADMIN)
  getBusOwnerProfile(@CurrentUser() user: UserDocument) {
    return this.busesService.getBusOwnerProfile(user._id.toString());
  }

  @Patch('owner/profile/:id/approve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  approveBusOwnerProfile(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
  ) {
    return this.busesService.approveBusOwnerProfile(id, user._id.toString());
  }

  @Patch('owner/profile/:id/reject')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  rejectBusOwnerProfile(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
    @Body('reason') reason: string,
  ) {
    return this.busesService.rejectBusOwnerProfile(
      id,
      user._id.toString(),
      reason,
    );
  }

  // Bus Management Endpoints
  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.BUS_OWNER)
  createBus(
    @CurrentUser() user: UserDocument,
    @Body() createBusDto: CreateBusDto,
  ) {
    return this.busesService.createBus(user._id.toString(), createBusDto);
  }

  @Get()
  findAllBuses(
    @CurrentUser() user: UserDocument,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('status') status?: BusStatus,
  ) {
    return this.busesService.findAllBuses(user, page, limit, status);
  }

  @Get(':id')
  findBusById(@Param('id') id: string, @CurrentUser() user: UserDocument) {
    return this.busesService.findBusById(id, user);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.BUS_OWNER, UserRole.ADMIN)
  updateBus(
    @Param('id') id: string,
    @Body() updateBusDto: UpdateBusDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.busesService.updateBus(id, updateBusDto, user);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.BUS_OWNER, UserRole.ADMIN)
  deleteBus(@Param('id') id: string, @CurrentUser() user: UserDocument) {
    return this.busesService.deleteBus(id, user);
  }

  @Patch(':id/seat-configuration')
  @UseGuards(RolesGuard)
  @Roles(UserRole.BUS_OWNER)
  updateSeatConfiguration(
    @Param('id') id: string,
    @Body() seatConfiguration: any,
    @CurrentUser() user: UserDocument,
  ) {
    return this.busesService.updateSeatConfiguration(
      id,
      seatConfiguration,
      user,
    );
  }

  @Get(':id/seat-map')
  async getSeatMap(@Param('id') id: string, @CurrentUser() user: UserDocument) {
    const bus = await this.busesService.findBusById(id, user);
    return {
      seatConfiguration: bus.seatConfiguration,
      totalSeats: bus.specifications.totalSeats,
    };
  }

  @Patch(':id/approve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  approveBus(@Param('id') id: string, @CurrentUser() user: UserDocument) {
    return this.busesService.approveBus(id, user._id.toString());
  }

  @Patch(':id/reject')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  rejectBus(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
    @Body('reason') reason: string,
  ) {
    return this.busesService.rejectBus(id, user._id.toString(), reason);
  }
}
