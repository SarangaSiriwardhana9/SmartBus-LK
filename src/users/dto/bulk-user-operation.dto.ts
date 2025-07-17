import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  ArrayNotEmpty,
} from 'class-validator';
import { UserStatus, UserRole } from '../../schemas/user.schema';

export enum BulkOperation {
  ACTIVATE = 'activate',
  SUSPEND = 'suspend',
  DELETE = 'delete',
  CHANGE_ROLE = 'change_role',
}

export class BulkUserOperationDto {
  @IsArray()
  @ArrayNotEmpty()
  userIds: string[];

  @IsEnum(BulkOperation)
  operation: BulkOperation;

  @IsEnum(UserRole)
  @IsOptional()
  newRole?: UserRole;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class UpdateUserStatusDto {
  @IsEnum(UserStatus)
  status: UserStatus;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class UpdateUserRoleDto {
  @IsEnum(UserRole)
  role: UserRole;

  @IsString()
  @IsOptional()
  reason?: string;
}
