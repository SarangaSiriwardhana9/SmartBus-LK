import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import {
  BulkUserOperationDto,
  UpdateUserStatusDto,
  UpdateUserRoleDto,
} from './dto/bulk-user-operation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, UserStatus } from '../schemas/user.schema';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAllUsers(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('role') role?: UserRole,
    @Query('status') status?: UserStatus,
    @Query('search') search?: string,
  ) {
    return this.usersService.findAllUsers(page, limit, role, status, search);
  }

  @Get('statistics')
  getUserStatistics() {
    return this.usersService.getUserStatistics();
  }

  @Get('pending-verifications')
  getPendingVerifications() {
    return this.usersService.getPendingVerifications();
  }

  @Get('search')
  searchUsers(
    @Query('q') query: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.usersService.searchUsers(query, limit);
  }

  @Get(':id')
  findUserById(@Param('id') id: string) {
    return this.usersService.findUserById(id);
  }

  @Patch(':id/status')
  updateUserStatus(
    @Param('id') id: string,
    @Body() updateUserStatusDto: UpdateUserStatusDto,
  ) {
    return this.usersService.updateUserStatus(id, updateUserStatusDto);
  }

  @Patch(':id/role')
  updateUserRole(
    @Param('id') id: string,
    @Body() updateUserRoleDto: UpdateUserRoleDto,
  ) {
    return this.usersService.updateUserRole(id, updateUserRoleDto);
  }

  @Delete(':id')
  deleteUser(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }

  @Post('bulk-operation')
  bulkUserOperation(@Body() bulkUserOperationDto: BulkUserOperationDto) {
    return this.usersService.bulkUserOperation(bulkUserOperationDto);
  }
}
