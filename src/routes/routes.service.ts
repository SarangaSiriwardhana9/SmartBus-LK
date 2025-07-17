/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Route, RouteDocument } from '../schemas/route.schema';
import { BusRoute, BusRouteDocument } from '../schemas/bus-route.schema';
import { Bus, BusDocument } from '../schemas/bus.schema';
import { UserDocument, UserRole } from '../schemas/user.schema';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';
import { CreateBusRouteDto } from './dto/create-bus-route.dto';
import { UpdateBusRouteDto } from './dto/update-bus-route.dto';

@Injectable()
export class RoutesService {
  constructor(
    @InjectModel(Route.name) private routeModel: Model<RouteDocument>,
    @InjectModel(BusRoute.name) private busRouteModel: Model<BusRouteDocument>,
    @InjectModel(Bus.name) private busModel: Model<BusDocument>,
  ) {}

  // Route Management
  async createRoute(createRouteDto: CreateRouteDto, user: UserDocument) {
    const route = new this.routeModel({
      ...createRouteDto,
      createdBy: user._id,
    });

    await route.save();

    return {
      message: 'Route created successfully',
      route: route.toObject(),
    };
  }

  async findAllRoutes(
    user: UserDocument,
    page: number = 1,
    limit: number = 10,
    search?: string,
    isActive?: boolean,
  ) {
    const skip = (page - 1) * limit;
    const filter: any = {};

    // Role-based filtering
    if (user.role === UserRole.BUS_OWNER) {
      filter.createdBy = user._id;
    }

    if (isActive !== undefined) {
      filter.isActive = isActive;
    }

    if (search) {
      filter.$or = [
        { routeName: { $regex: search, $options: 'i' } },
        { 'origin.city': { $regex: search, $options: 'i' } },
        { 'destination.city': { $regex: search, $options: 'i' } },
      ];
    }

    const [routes, total] = await Promise.all([
      this.routeModel
        .find(filter)
        .populate('createdBy', 'email profile.firstName profile.lastName')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      this.routeModel.countDocuments(filter),
    ]);

    return {
      routes,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findRouteById(id: string, user: UserDocument) {
    const route = await this.routeModel
      .findById(id)
      .populate('createdBy', 'email profile.firstName profile.lastName');

    if (!route) {
      throw new NotFoundException('Route not found');
    }

    // Check permissions
    if (
      user.role === UserRole.BUS_OWNER &&
      route.createdBy._id.toString() !== user._id.toString()
    ) {
      throw new ForbiddenException('Access denied to this route');
    }

    return route;
  }

  async updateRoute(
    id: string,
    updateRouteDto: UpdateRouteDto,
    user: UserDocument,
  ) {
    const route = await this.findRouteById(id, user);

    if (
      user.role === UserRole.BUS_OWNER &&
      route.createdBy._id.toString() !== user._id.toString()
    ) {
      throw new ForbiddenException('Access denied to update this route');
    }

    Object.assign(route, updateRouteDto);
    await route.save();

    return {
      message: 'Route updated successfully',
      route: route.toObject(),
    };
  }

  async deleteRoute(id: string, user: UserDocument) {
    const route = await this.findRouteById(id, user);

    if (
      user.role === UserRole.BUS_OWNER &&
      route.createdBy._id.toString() !== user._id.toString()
    ) {
      throw new ForbiddenException('Access denied to delete this route');
    }

    // Check if route is assigned to any buses
    const busRoutes = await this.busRouteModel.find({ routeId: id });
    if (busRoutes.length > 0) {
      throw new BadRequestException(
        'Cannot delete route that is assigned to buses. Please remove bus assignments first.',
      );
    }

    await this.routeModel.findByIdAndDelete(id);

    return { message: 'Route deleted successfully' };
  }

  // Bus Route Assignment
  async assignBusToRoute(
    createBusRouteDto: CreateBusRouteDto,
    user: UserDocument,
  ) {
    const { busId, routeId } = createBusRouteDto;

    // Verify bus exists and user has permission
    const bus = await this.busModel.findById(busId);
    if (!bus) {
      throw new NotFoundException('Bus not found');
    }

    if (
      user.role === UserRole.BUS_OWNER &&
      bus.ownerId.toString() !== user._id.toString()
    ) {
      throw new ForbiddenException('Access denied to this bus');
    }

    // Verify route exists
    const route = await this.routeModel.findById(routeId);
    if (!route) {
      throw new NotFoundException('Route not found');
    }

    // Check if bus is already assigned to this route
    const existingAssignment = await this.busRouteModel.findOne({
      busId: new Types.ObjectId(busId),
      routeId: new Types.ObjectId(routeId),
    });

    if (existingAssignment) {
      throw new ConflictException('Bus is already assigned to this route');
    }

    // Convert driver IDs to ObjectIds
    const driverAssignment = createBusRouteDto.driverAssignment;
    if (driverAssignment) {
      if (driverAssignment.primaryDriver) {
        driverAssignment.primaryDriver = new Types.ObjectId(
          driverAssignment.primaryDriver,
        ) as any;
      }
      if (driverAssignment.secondaryDriver) {
        driverAssignment.secondaryDriver = new Types.ObjectId(
          driverAssignment.secondaryDriver,
        ) as any;
      }
      if (driverAssignment.conductor) {
        driverAssignment.conductor = new Types.ObjectId(
          driverAssignment.conductor,
        ) as any;
      }
    }

    const busRoute = new this.busRouteModel({
      busId: new Types.ObjectId(busId),
      routeId: new Types.ObjectId(routeId),
      schedule: createBusRouteDto.schedule,
      pricing: createBusRouteDto.pricing,
      driverAssignment,
      specialNotes: createBusRouteDto.specialNotes,
      createdBy: user._id,
    });

    await busRoute.save();

    return {
      message: 'Bus assigned to route successfully',
      busRoute: busRoute.toObject(),
    };
  }

  async findBusRoutes(
    user: UserDocument,
    page: number = 1,
    limit: number = 10,
    busId?: string,
    routeId?: string,
  ) {
    const skip = (page - 1) * limit;
    const filter: any = {};

    if (busId) {
      filter.busId = new Types.ObjectId(busId);
    }

    if (routeId) {
      filter.routeId = new Types.ObjectId(routeId);
    }

    // Role-based filtering
    if (user.role === UserRole.BUS_OWNER) {
      filter.createdBy = user._id;
    }

    const [busRoutes, total] = await Promise.all([
      this.busRouteModel
        .find(filter)
        .populate('busId', 'registrationNumber specifications')
        .populate('routeId', 'routeName origin destination')
        .populate('createdBy', 'email profile.firstName profile.lastName')
        .populate(
          'driverAssignment.primaryDriver',
          'email profile.firstName profile.lastName',
        )
        .populate(
          'driverAssignment.secondaryDriver',
          'email profile.firstName profile.lastName',
        )
        .populate(
          'driverAssignment.conductor',
          'email profile.firstName profile.lastName',
        )
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      this.busRouteModel.countDocuments(filter),
    ]);

    return {
      busRoutes,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findBusRouteById(id: string, user: UserDocument) {
    const busRoute = await this.busRouteModel
      .findById(id)
      .populate('busId', 'registrationNumber specifications')
      .populate('routeId', 'routeName origin destination intermediateStops')
      .populate('createdBy', 'email profile.firstName profile.lastName')
      .populate(
        'driverAssignment.primaryDriver',
        'email profile.firstName profile.lastName',
      )
      .populate(
        'driverAssignment.secondaryDriver',
        'email profile.firstName profile.lastName',
      )
      .populate(
        'driverAssignment.conductor',
        'email profile.firstName profile.lastName',
      );

    if (!busRoute) {
      throw new NotFoundException('Bus route assignment not found');
    }

    // Check permissions
    if (
      user.role === UserRole.BUS_OWNER &&
      busRoute.createdBy._id.toString() !== user._id.toString()
    ) {
      throw new ForbiddenException('Access denied to this bus route');
    }

    return busRoute;
  }

  async updateBusRoute(
    id: string,
    updateBusRouteDto: UpdateBusRouteDto,
    user: UserDocument,
  ) {
    const busRoute = await this.findBusRouteById(id, user);

    if (
      user.role === UserRole.BUS_OWNER &&
      busRoute.createdBy._id.toString() !== user._id.toString()
    ) {
      throw new ForbiddenException('Access denied to update this bus route');
    }

    Object.assign(busRoute, updateBusRouteDto);
    await busRoute.save();

    return {
      message: 'Bus route updated successfully',
      busRoute: busRoute.toObject(),
    };
  }

  async deleteBusRoute(id: string, user: UserDocument) {
    const busRoute = await this.findBusRouteById(id, user);

    if (
      user.role === UserRole.BUS_OWNER &&
      busRoute.createdBy._id.toString() !== user._id.toString()
    ) {
      throw new ForbiddenException('Access denied to delete this bus route');
    }

    await this.busRouteModel.findByIdAndDelete(id);

    return { message: 'Bus route assignment deleted successfully' };
  }

  // Search routes between cities
  async searchRoutes(originCity: string, destinationCity: string) {
    const routes = await this.routeModel.find({
      'origin.city': { $regex: originCity, $options: 'i' },
      'destination.city': { $regex: destinationCity, $options: 'i' },
      isActive: true,
    });

    return {
      routes,
      count: routes.length,
    };
  }

  // Get popular routes
  async getPopularRoutes() {
    const routes = await this.routeModel.aggregate([
      { $match: { isActive: true } },
      {
        $lookup: {
          from: 'busroutes',
          localField: '_id',
          foreignField: 'routeId',
          as: 'busAssignments',
        },
      },
      {
        $addFields: {
          busCount: { $size: '$busAssignments' },
        },
      },
      { $sort: { busCount: -1 } },
      { $limit: 10 },
    ]);

    return {
      routes,
      message: 'Popular routes retrieved successfully',
    };
  }
}
