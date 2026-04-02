import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTicketTypeDto {
  @ApiProperty()
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  price_idr: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  quota: number;

  @ApiProperty()
  @IsDateString()
  sale_start_at: string;

  @ApiProperty()
  @IsDateString()
  sale_end_at: string;

  @ApiPropertyOptional({ default: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  max_per_user?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  zone_id?: string;
}
