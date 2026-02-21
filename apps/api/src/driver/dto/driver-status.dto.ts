import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { DriverStatus } from '@prisma/client';

export class DriverStatusDto {
  @ApiProperty({ enum: DriverStatus })
  @IsEnum(DriverStatus)
  status: DriverStatus;
}
