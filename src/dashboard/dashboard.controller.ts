import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardFilterDto } from './dto/dashboard-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserDocument, UserRole } from '../schemas/user.schema';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('admin')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  getAdminDashboard(@Query() filters: DashboardFilterDto) {
    return this.dashboardService.getAdminDashboard(filters);
  }

  @Get('bus-owner')
  @UseGuards(RolesGuard)
  @Roles(UserRole.BUS_OWNER)
  getBusOwnerDashboard(
    @CurrentUser() user: UserDocument,
    @Query() filters: DashboardFilterDto,
  ) {
    return this.dashboardService.getBusOwnerDashboard(
      user._id.toString(),
      filters,
    );
  }

  @Get('passenger')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PASSENGER)
  getPassengerDashboard(
    @CurrentUser() user: UserDocument,
    @Query() filters: DashboardFilterDto,
  ) {
    return this.dashboardService.getPassengerDashboard(
      user._id.toString(),
      filters,
    );
  }

  @Get('driver')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DRIVER)
  getDriverDashboard(
    @CurrentUser() user: UserDocument,
    @Query() filters: DashboardFilterDto,
  ) {
    return this.dashboardService.getDriverDashboard(
      user._id.toString(),
      filters,
    );
  }

  @Get('conductor')
  @UseGuards(RolesGuard)
  @Roles(UserRole.CONDUCTOR)
  getConductorDashboard(
    @CurrentUser() user: UserDocument,
    @Query() filters: DashboardFilterDto,
  ) {
    return this.dashboardService.getConductorDashboard(
      user._id.toString(),
      filters,
    );
  }
}
