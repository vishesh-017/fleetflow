import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, IsNumber, IsEnum, IsOptional, IsDateString, Min } from 'class-validator';
import { VehicleStatus, LicenseCategory } from '@prisma/client';

export class CreateVehicleDto {
  @ApiProperty()
  @IsString()
  licensePlate: string;

  @ApiProperty()
  @IsString()
  make: string;

  @ApiProperty()
  @IsString()
  model: string;

  @ApiProperty()
  @IsInt()
  @Min(1900)
  year: number;

  @ApiProperty()
  @IsString()
  type: string;

  @ApiProperty({ required: false, enum: VehicleStatus })
  @IsEnum(VehicleStatus)
  @IsOptional()
  status?: VehicleStatus;

  @ApiProperty({ default: 0 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  odometer?: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  maxLoadCapacity: number;

  @ApiProperty()
  @IsString()
  fuelType: string;

  @ApiProperty({ enum: LicenseCategory })
  @IsEnum(LicenseCategory)
  requiredLicenseCategory: LicenseCategory;

  @ApiProperty()
  @IsDateString()
  acquisitionDate: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  region?: string;
}
