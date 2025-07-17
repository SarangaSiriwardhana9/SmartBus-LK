/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Bus, BusDocument, BusStatus } from '../schemas/bus.schema';
import {
  BusOwnerProfile,
  BusOwnerProfileDocument,
  VerificationStatus,
} from '../schemas/bus-owner-profile.schema';
import { UserDocument, UserRole } from '../schemas/user.schema';
import { CreateBusDto } from './dto/create-bus.dto';
import { UpdateBusDto } from './dto/update-bus.dto';
import { CreateBusOwnerProfileDto } from './dto/bus-owner-profile.dto';

@Injectable()
export class BusesService {
  constructor(
    @InjectModel(Bus.name) private busModel: Model<BusDocument>,
    @InjectModel(BusOwnerProfile.name)
    private busOwnerProfileModel: Model<BusOwnerProfileDocument>,
  ) {}

  // Bus Owner Profile Management
  async createBusOwnerProfile(
    userId: string,
    createBusOwnerProfileDto: CreateBusOwnerProfileDto,
  ) {
    const existingProfile = await this.busOwnerProfileModel.findOne({
      userId: new Types.ObjectId(userId),
    });

    if (existingProfile) {
      throw new ConflictException('Bus owner profile already exists');
    }

    const profile = new this.busOwnerProfileModel({
      userId: new Types.ObjectId(userId),
      ...createBusOwnerProfileDto,
    });

    await profile.save();

    return {
      message: 'Bus owner profile created successfully',
      profile: profile.toObject(),
    };
  }

  async getBusOwnerProfile(userId: string) {
    const profile = await this.busOwnerProfileModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .populate('userId', 'email profile')
      .populate('approvedBy', 'email profile.firstName profile.lastName');

    if (!profile) {
      throw new NotFoundException('Bus owner profile not found');
    }

    return profile;
  }

  async approveBusOwnerProfile(profileId: string, adminId: string) {
    const profile = await this.busOwnerProfileModel.findById(profileId);

    if (!profile) {
      throw new NotFoundException('Bus owner profile not found');
    }

    profile.verificationStatus = VerificationStatus.APPROVED;
    profile.approvedBy = new Types.ObjectId(adminId);
    await profile.save();

    return {
      message: 'Bus owner profile approved successfully',
      profile: profile.toObject(),
    };
  }

  async rejectBusOwnerProfile(
    profileId: string,
    adminId: string,
    reason: string,
  ) {
    const profile = await this.busOwnerProfileModel.findById(profileId);

    if (!profile) {
      throw new NotFoundException('Bus owner profile not found');
    }

    profile.verificationStatus = VerificationStatus.REJECTED;
    profile.approvedBy = new Types.ObjectId(adminId);
    profile.rejectionReason = reason;
    await profile.save();

    return {
      message: 'Bus owner profile rejected',
      profile: profile.toObject(),
    };
  }

  // Bus Management
  async createBus(ownerId: string, createBusDto: CreateBusDto) {
    // Check if bus owner profile is approved
    const ownerProfile = await this.busOwnerProfileModel.findOne({
      userId: new Types.ObjectId(ownerId),
    });

    if (!ownerProfile) {
      throw new BadRequestException('Bus owner profile not found');
    }

    if (ownerProfile.verificationStatus !== VerificationStatus.APPROVED) {
      throw new ForbiddenException(
        'Bus owner profile must be approved before registering buses',
      );
    }

    // Check if registration number already exists
    const existingBus = await this.busModel.findOne({
      registrationNumber: createBusDto.registrationNumber,
    });

    if (existingBus) {
      throw new ConflictException(
        'Bus with this registration number already exists',
      );
    }

    const bus = new this.busModel({
      ownerId: new Types.ObjectId(ownerId),
      ...createBusDto,
    });

    await bus.save();

    return {
      message: 'Bus registered successfully',
      bus: bus.toObject(),
    };
  }

  async findAllBuses(
    user: UserDocument,
    page: number = 1,
    limit: number = 10,
    status?: BusStatus,
  ) {
    const skip = (page - 1) * limit;
    const filter: any = {};

    // Role-based filtering
    if (user.role === UserRole.BUS_OWNER) {
      filter.ownerId = user._id;
    }

    if (status) {
      filter.status = status;
    }

    const [buses, total] = await Promise.all([
      this.busModel
        .find(filter)
        .populate('ownerId', 'email profile.firstName profile.lastName')
        .populate('approvedBy', 'email profile.firstName profile.lastName')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      this.busModel.countDocuments(filter),
    ]);

    return {
      buses,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findBusById(id: string, user: UserDocument) {
    const bus = await this.busModel
      .findById(id)
      .populate('ownerId', 'email profile.firstName profile.lastName')
      .populate('approvedBy', 'email profile.firstName profile.lastName');

    if (!bus) {
      throw new NotFoundException('Bus not found');
    }

    // Check permissions
    if (
      user.role === UserRole.BUS_OWNER &&
      bus.ownerId._id.toString() !== user._id.toString()
    ) {
      throw new ForbiddenException('Access denied to this bus');
    }

    return bus;
  }

  async updateBus(id: string, updateBusDto: UpdateBusDto, user: UserDocument) {
    const bus = await this.findBusById(id, user);

    // Only bus owner can update their own buses (except status changes by admin)
    if (
      user.role === UserRole.BUS_OWNER &&
      bus.ownerId._id.toString() !== user._id.toString()
    ) {
      throw new ForbiddenException('Access denied to update this bus');
    }

    Object.assign(bus, updateBusDto);

    if (updateBusDto.status && user.role === UserRole.ADMIN) {
      if (updateBusDto.status === BusStatus.ACTIVE) {
        bus.approvedBy = user._id;
        bus.approvedAt = new Date();
      }
    }

    await bus.save();

    return {
      message: 'Bus updated successfully',
      bus: bus.toObject(),
    };
  }

  async deleteBus(id: string, user: UserDocument) {
    const bus = await this.findBusById(id, user);

    if (
      user.role === UserRole.BUS_OWNER &&
      bus.ownerId._id.toString() !== user._id.toString()
    ) {
      throw new ForbiddenException('Access denied to delete this bus');
    }

    await this.busModel.findByIdAndDelete(id);

    return { message: 'Bus deleted successfully' };
  }

  async updateSeatConfiguration(
    busId: string,
    seatConfiguration: any,
    user: UserDocument,
  ) {
    const bus = await this.findBusById(busId, user);

    if (
      user.role === UserRole.BUS_OWNER &&
      bus.ownerId._id.toString() !== user._id.toString()
    ) {
      throw new ForbiddenException('Access denied to update this bus');
    }

    bus.seatConfiguration = seatConfiguration;
    await bus.save();

    return {
      message: 'Seat configuration updated successfully',
      seatConfiguration: bus.seatConfiguration,
    };
  }

  async approveBus(id: string, adminId: string) {
    const bus = await this.busModel.findById(id);

    if (!bus) {
      throw new NotFoundException('Bus not found');
    }

    bus.status = BusStatus.ACTIVE;
    bus.approvedBy = new Types.ObjectId(adminId);
    bus.approvedAt = new Date();
    await bus.save();

    return {
      message: 'Bus approved successfully',
      bus: bus.toObject(),
    };
  }

  async rejectBus(id: string, adminId: string, reason: string) {
    const bus = await this.busModel.findById(id);

    if (!bus) {
      throw new NotFoundException('Bus not found');
    }

    bus.status = BusStatus.INACTIVE;
    bus.approvedBy = new Types.ObjectId(adminId);
    bus.rejectionReason = reason;
    await bus.save();

    return {
      message: 'Bus rejected',
      bus: bus.toObject(),
    };
  }
}
