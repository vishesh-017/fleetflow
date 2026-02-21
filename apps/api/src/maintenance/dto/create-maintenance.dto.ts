import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsInt, IsOptional, IsDateString, Min } from 'class-validator';

export class CreateMaintenanceDto {
  @ApiProperty()
  @IsString()
  vehicleId: string;

  @ApiProperty()
  @IsString()
  serviceType: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  cost: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  odometer: number;

  @ApiProperty()
  @IsDateString()
  scheduledDate: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}
