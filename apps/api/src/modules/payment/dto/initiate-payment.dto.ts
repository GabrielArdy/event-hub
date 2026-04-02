import { IsEnum, IsOptional, IsString, IsUrl, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';

export class InitiatePaymentDto {
  @ApiProperty()
  @IsUUID()
  order_id: string;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  payment_method: PaymentMethod;

  @ApiPropertyOptional({ description: 'Diperlukan jika BANK_TRANSFER' })
  @IsOptional()
  @IsString()
  bank_code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  return_url?: string;
}
