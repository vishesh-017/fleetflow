import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsUUID, IsDateString } from 'class-validator';
import { ViolationSeverity } from '@prisma/client';

export class CreateViolationDto {
  @ApiProperty()
  @IsString()
  type: string;

  @ApiProperty({ enum: ViolationSeverity })
  @IsEnum(ViolationSeverity)
  severity: ViolationSeverity;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  tripId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
