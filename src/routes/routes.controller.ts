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
  ParseBoolPipe,
} from '@nestjs/common';
import { RoutesService } from './routes.service';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';
import { CreateBusRouteDto } from './dto/create-bus-route.dto';
import { UpdateBusRouteDto } from './dto/update-bus-route.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserDocument, UserRole } from '../schemas/user.schema';

@Controller('routes')
@UseGuards(JwtAuthGuard)
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  // Route Management
  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.BUS_OWNER)
  createRoute(
    @Body() createRouteDto: CreateRouteDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.routesService.createRoute(createRouteDto, user);
  }

  @Get()
  findAllRoutes(
    @CurrentUser() user: UserDocument,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('search') search?: string,
    @Query('isActive', new ParseBoolPipe({ optional: true }))
    isActive?: boolean,
  ) {
    return this.routesService.findAllRoutes(
      user,
      page,
      limit,
      search,
      isActive,
    );
  }

  @Get('search')
  searchRoutes(
    @Query('origin') originCity: string,
    @Query('destination') destinationCity: string,
  ) {
    return this.routesService.searchRoutes(originCity, destinationCity);
  }

  @Get('popular')
  getPopularRoutes() {
    return this.routesService.getPopularRoutes();
  }

  @Get(':id')
  findRoute(@Param('id') id: string, @CurrentUser() user: UserDocument) {
    return this.routesService.findRouteById(id, user);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.BUS_OWNER)
  updateRoute(
    @Param('id') id: string,
    @Body() updateRouteDto: UpdateRouteDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.routesService.updateRoute(id, updateRouteDto, user);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.BUS_OWNER)
  deleteRoute(@Param('id') id: string, @CurrentUser() user: UserDocument) {
    return this.routesService.deleteRoute(id, user);
  }

  // Bus Route Assignment
  @Post('bus-assignments')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.BUS_OWNER)
  assignBusToRoute(
    @Body() createBusRouteDto: CreateBusRouteDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.routesService.assignBusToRoute(createBusRouteDto, user);
  }

  @Get('bus-assignments/list')
  findBusRoutes(
    @CurrentUser() user: UserDocument,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('busId') busId?: string,
    @Query('routeId') routeId?: string,
  ) {
    return this.routesService.findBusRoutes(user, page, limit, busId, routeId);
  }

  @Get('bus-assignments/:id')
  findBusRoute(@Param('id') id: string, @CurrentUser() user: UserDocument) {
    return this.routesService.findBusRouteById(id, user);
  }

  @Patch('bus-assignments/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.BUS_OWNER)
  updateBusRoute(
    @Param('id') id: string,
    @Body() updateBusRouteDto: UpdateBusRouteDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.routesService.updateBusRoute(id, updateBusRouteDto, user);
  }

  @Delete('bus-assignments/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.BUS_OWNER)
  deleteBusRoute(@Param('id') id: string, @CurrentUser() user: UserDocument) {
    return this.routesService.deleteBusRoute(id, user);
  }
}
