import { IsArray, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FeeBearer, PaymentMethod, RefundPolicy } from '@prisma/client';

export class SetPaymentConfigDto {
  @ApiProperty({ enum: PaymentMethod, isArray: true })
  @IsArray()
  @IsEnum(PaymentMethod, { each: true })
  payment_methods: PaymentMethod[];

  @ApiProperty({ enum: FeeBearer })
  @IsEnum(FeeBearer)
  fee_bearer: FeeBearer;

  @ApiProperty({ enum: RefundPolicy })
  @IsEnum(RefundPolicy)
  refund_policy: RefundPolicy;

  @ApiPropertyOptional({ minimum: 1, maximum: 99 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(99)
  refund_percent?: number;
}
