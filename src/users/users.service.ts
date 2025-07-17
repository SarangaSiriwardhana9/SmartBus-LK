/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  User,
  UserDocument,
  UserStatus,
  UserRole,
} from '../schemas/user.schema';
import {
  BulkUserOperationDto,
  UpdateUserStatusDto,
  UpdateUserRoleDto,
} from './dto/bulk-user-operation.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  // Get all users with filters
  async findAllUsers(
    page: number = 1,
    limit: number = 10,
    role?: UserRole,
    status?: UserStatus,
    search?: string,
  ) {
    const skip = (page - 1) * limit;
    const filter: any = {};

    if (role) {
      filter.role = role;
    }

    if (status) {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: 'i' } },
        { 'profile.firstName': { $regex: search, $options: 'i' } },
        { 'profile.lastName': { $regex: search, $options: 'i' } },
        { 'profile.phone': { $regex: search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.userModel
        .find(filter)
        .select('-password -refreshToken')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      this.userModel.countDocuments(filter),
    ]);

    return {
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Get user by ID
  async findUserById(id: string) {
    const user = await this.userModel
      .findById(id)
      .select('-password -refreshToken');

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  // Update user status
  async updateUserStatus(id: string, updateUserStatusDto: UpdateUserStatusDto) {
    const user = await this.findUserById(id);

    if (user.role === UserRole.ADMIN) {
      throw new ForbiddenException('Cannot modify admin user status');
    }

    user.status = updateUserStatusDto.status;
    await user.save();

    return {
      message: `User ${updateUserStatusDto.status} successfully`,
      user: user.toObject(),
    };
  }

  // Update user role
  async updateUserRole(id: string, updateUserRoleDto: UpdateUserRoleDto) {
    const user = await this.findUserById(id);

    if (user.role === UserRole.ADMIN) {
      throw new ForbiddenException('Cannot modify admin user role');
    }

    user.role = updateUserRoleDto.role;
    await user.save();

    return {
      message: 'User role updated successfully',
      user: user.toObject(),
    };
  }

  // Delete user
  async deleteUser(id: string) {
    const user = await this.findUserById(id);

    if (user.role === UserRole.ADMIN) {
      throw new ForbiddenException('Cannot delete admin user');
    }

    await this.userModel.findByIdAndDelete(id);

    return { message: 'User deleted successfully' };
  }

  // Bulk operations
  async bulkUserOperation(bulkUserOperationDto: BulkUserOperationDto) {
    const { userIds, operation, newRole, reason } = bulkUserOperationDto;

    // Verify all users exist and are not admins
    const users = await this.userModel.find({
      _id: { $in: userIds },
      role: { $ne: UserRole.ADMIN }, // Exclude admins from bulk operations
    });

    if (users.length !== userIds.length) {
      throw new BadRequestException(
        'Some users not found or cannot be modified',
      );
    }

    let updateQuery: any = {};
    let successMessage = '';

    switch (operation) {
      case 'activate':
        updateQuery = { status: UserStatus.ACTIVE };
        successMessage = 'Users activated successfully';
        break;
      case 'suspend':
        updateQuery = { status: UserStatus.SUSPENDED };
        successMessage = 'Users suspended successfully';
        break;
      case 'change_role':
        if (!newRole) {
          throw new BadRequestException(
            'New role is required for role change operation',
          );
        }
        updateQuery = { role: newRole };
        successMessage = 'User roles updated successfully';
        break;
      case 'delete':
        await this.userModel.deleteMany({ _id: { $in: userIds } });
        return {
          message: 'Users deleted successfully',
          affectedCount: users.length,
        };
      default:
        throw new BadRequestException('Invalid bulk operation');
    }

    const result = await this.userModel.updateMany(
      { _id: { $in: userIds } },
      updateQuery,
    );

    return {
      message: successMessage,
      affectedCount: result.modifiedCount,
      reason,
    };
  }

  // Get user statistics
  async getUserStatistics() {
    const [totalUsers, usersByRole, usersByStatus, recentRegistrations] =
      await Promise.all([
        this.userModel.countDocuments(),
        this.userModel.aggregate([
          { $group: { _id: '$role', count: { $sum: 1 } } },
        ]),
        this.userModel.aggregate([
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        this.userModel.countDocuments({
          createdAt: {
            $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        }),
      ]);

    return {
      totalUsers,
      usersByRole,
      usersByStatus,
      recentRegistrations,
    };
  }

  // Get pending verifications
  async getPendingVerifications() {
    const pendingUsers = await this.userModel
      .find({
        $or: [
          { 'verification.emailVerified': false },
          { 'verification.phoneVerified': false },
          { 'verification.documentsVerified': false },
        ],
      })
      .select('-password -refreshToken')
      .sort({ createdAt: -1 });

    return {
      users: pendingUsers,
      count: pendingUsers.length,
    };
  }

  // Search users
  async searchUsers(query: string, limit: number = 20) {
    const users = await this.userModel
      .find({
        $or: [
          { email: { $regex: query, $options: 'i' } },
          { 'profile.firstName': { $regex: query, $options: 'i' } },
          { 'profile.lastName': { $regex: query, $options: 'i' } },
          { 'profile.phone': { $regex: query, $options: 'i' } },
        ],
      })
      .select('-password -refreshToken')
      .limit(limit);

    return {
      users,
      count: users.length,
    };
  }
}
