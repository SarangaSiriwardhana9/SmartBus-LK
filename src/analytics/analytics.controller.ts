import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { ReportFilterDto } from './dto/report-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserDocument, UserRole } from '../schemas/user.schema';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('revenue')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.BUS_OWNER)
  getRevenueReport(
    @Query() filters: ReportFilterDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.analyticsService.getRevenueReport(filters, user);
  }

  @Get('bookings')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.BUS_OWNER)
  getBookingAnalytics(
    @Query() filters: ReportFilterDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.analyticsService.getBookingAnalytics(filters, user);
  }

  @Get('performance')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.BUS_OWNER)
  getBusPerformanceReport(
    @Query() filters: ReportFilterDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.analyticsService.getBusPerformanceReport(filters, user);
  }

  @Get('occupancy')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.BUS_OWNER)
  getOccupancyAnalysis(
    @Query() filters: ReportFilterDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.analyticsService.getOccupancyAnalysis(filters, user);
  }

  @Get('financial-summary')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.BUS_OWNER)
  getFinancialSummary(
    @Query() filters: ReportFilterDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.analyticsService.getFinancialSummary(filters, user);
  }
}
