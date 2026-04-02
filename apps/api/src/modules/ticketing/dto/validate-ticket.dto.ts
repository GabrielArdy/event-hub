import { IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ValidateTicketDto {
  @ApiProperty()
  @IsString()
  qr_token: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  device_id?: string;
}
