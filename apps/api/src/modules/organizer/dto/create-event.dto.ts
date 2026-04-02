import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventCategory, VenueType } from '@prisma/client';

class VenueDto {
  @ApiProperty({ enum: VenueType })
  @IsEnum(VenueType)
  type: VenueType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  lat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  lng?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  online_url?: string;
}

export class CreateEventDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  description: string;

  @ApiProperty({ enum: EventCategory })
  @IsEnum(EventCategory)
  category: EventCategory;

  @ApiProperty()
  @IsDateString()
  start_at: string;

  @ApiProperty()
  @IsDateString()
  end_at: string;

  @ApiProperty({ type: VenueDto })
  @ValidateNested()
  @Type(() => VenueDto)
  venue: VenueDto;

  @ApiProperty()
  @IsInt()
  @Min(1)
  max_capacity: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  banner_url?: string;
}
