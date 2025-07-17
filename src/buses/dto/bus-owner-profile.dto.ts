import {
  IsString,
  IsNotEmpty,
  IsOptional,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BankDetailsDto {
  @IsString()
  @IsNotEmpty()
  bankName: string;

  @IsString()
  @IsNotEmpty()
  accountNumber: string;

  @IsString()
  @IsNotEmpty()
  accountHolderName: string;

  @IsString()
  @IsNotEmpty()
  branchCode: string;
}

export class CreateBusOwnerProfileDto {
  @IsString()
  @IsNotEmpty()
  businessName: string;

  @IsString()
  @IsNotEmpty()
  businessLicense: string;

  @IsString()
  @IsOptional()
  taxId?: string;

  @ValidateNested()
  @Type(() => BankDetailsDto)
  @IsOptional()
  bankDetails?: BankDetailsDto;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  documents?: string[];
}

export class UpdateBusOwnerProfileDto {
  @IsString()
  @IsOptional()
  businessName?: string;

  @IsString()
  @IsOptional()
  businessLicense?: string;

  @IsString()
  @IsOptional()
  taxId?: string;

  @ValidateNested()
  @Type(() => BankDetailsDto)
  @IsOptional()
  bankDetails?: BankDetailsDto;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  documents?: string[];
}
