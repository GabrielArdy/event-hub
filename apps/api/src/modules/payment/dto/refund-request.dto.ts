import { IsArray, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefundRequestDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  ticket_ids: string[];

  @ApiProperty()
  @IsString()
  @MaxLength(500)
  reason: string;
}
