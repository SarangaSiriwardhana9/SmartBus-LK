import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';

import { SearchTripsDto } from './dto/search-trips.dto';
import { CreateTripDto } from './dto/create-trip.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserDocument, UserRole } from '../schemas/user.schema';
import { BookingStatus } from '../schemas/booking.schema';

@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  // Trip Management Endpoints
  @Post('trips')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.BUS_OWNER)
  createTrip(
    @Body() createTripDto: CreateTripDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.bookingsService.createTrip(createTripDto, user);
  }

  @Post('search')
  searchTrips(@Body() searchTripsDto: SearchTripsDto) {
    return this.bookingsService.searchTrips(searchTripsDto);
  }

  @Get('trips/:tripId/seats')
  getTripSeatAvailability(@Param('tripId') tripId: string) {
    return this.bookingsService.getTripSeatAvailability(tripId);
  }

  // Booking Management Endpoints
  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.PASSENGER, UserRole.ADMIN)
  createBooking(
    @Body() createBookingDto: CreateBookingDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.bookingsService.createBooking(createBookingDto, user);
  }

  @Get()
  findAllBookings(
    @CurrentUser() user: UserDocument,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('status') status?: BookingStatus,
  ) {
    return this.bookingsService.findAllBookings(user, page, limit, status);
  }

  @Get(':id')
  findBookingById(@Param('id') id: string, @CurrentUser() user: UserDocument) {
    return this.bookingsService.findBookingById(id, user);
  }

  @Patch(':id/cancel')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PASSENGER, UserRole.ADMIN)
  cancelBooking(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
    @Body('reason') reason?: string,
  ) {
    return this.bookingsService.cancelBooking(id, user, reason);
  }

  @Get(':id/ticket')
  async downloadTicket(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
  ) {
    const booking = await this.bookingsService.findBookingById(id, user);
    return {
      message: 'E-ticket retrieved successfully',
      ticket: {
        bookingReference: booking.bookingReference,
        passenger: booking.passengerId,
        journey: booking.journeyDetails,
        seats: booking.seatDetails,
        pricing: booking.pricing,
        qrCode: `BMS-${booking.bookingReference}`, // For mobile scanning
      },
    };
  }
}
