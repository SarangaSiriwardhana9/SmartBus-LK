import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MinLength,
  ValidateNested,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole } from '../../schemas/user.schema';

class ProfileDto {
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @IsNotEmpty()
  @IsString()
  lastName: string;

  @IsNotEmpty()
  @IsString()
  phone: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsEnum(['male', 'female', 'other'])
  gender?: string;
}

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsEnum(UserRole)
  role: UserRole;

  @ValidateNested()
  @Type(() => ProfileDto)
  profile: ProfileDto;
}
