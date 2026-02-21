import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsEnum, IsDateString } from 'class-validator';
import { LicenseCategory } from '@prisma/client';

export class CreateDriverDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  phone: string;

  @ApiProperty()
  @IsString()
  licenseNumber: string;

  @ApiProperty({ enum: LicenseCategory })
  @IsEnum(LicenseCategory)
  licenseCategory: LicenseCategory;

  @ApiProperty()
  @IsDateString()
  licenseExpiryDate: string;
}
