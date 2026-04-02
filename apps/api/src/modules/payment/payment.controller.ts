import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { FastifyRequest } from 'fastify';
import { PaymentService } from './payment.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { RefundRequestDto } from './dto/refund-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Payment')
@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('initiate')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard)
  @Roles(Role.END_USER, Role.ADMIN)
  @ApiOperation({ summary: 'Mulai proses pembayaran' })
  async initiatePayment(@CurrentUser() user: RequestUser, @Body() dto: InitiatePaymentDto) {
    const data = await this.paymentService.initiatePayment(user.id, dto);
    return { success: true, data };
  }

  @Get(':payment_id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Status detail pembayaran' })
  async getPayment(
    @CurrentUser() user: RequestUser,
    @Param('payment_id') paymentId: string,
  ) {
    const data = await this.paymentService.getPayment(user.id, paymentId);
    return { success: true, data };
  }

  @Post('webhook/:gateway')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook dari payment gateway (internal)' })
  async handleWebhook(
    @Param('gateway') gateway: string,
    @Body() payload: any,
    @Req() req: FastifyRequest,
  ) {
    const signature =
      (req.headers['x-callback-token'] as string) ||
      (req.headers['x-signature-key'] as string) ||
      payload.signature_key ||
      '';
    return this.paymentService.handleWebhook(gateway, payload, signature);
  }

  @Post('refund/request')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(RolesGuard)
  @Roles(Role.END_USER, Role.ADMIN)
  @ApiOperation({ summary: 'Ajukan permohonan refund' })
  async requestRefund(@CurrentUser() user: RequestUser, @Body() dto: RefundRequestDto) {
    const data = await this.paymentService.requestRefund(user.id, dto);
    return { success: true, data };
  }

  @Get('refund/:refund_request_id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Status permohonan refund' })
  async getRefund(
    @CurrentUser() user: RequestUser,
    @Param('refund_request_id') refundRequestId: string,
  ) {
    const data = await this.paymentService.getRefund(user.id, refundRequestId);
    return { success: true, data };
  }

  @Post('refund/bulk')
  @Public()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Bulk refund (internal — dipanggil oleh organizer module)' })
  async processBulkRefund(
    @Body() payload: { event_id: string; reason: string; triggered_by: string },
    @Req() req: FastifyRequest,
  ) {
    const internalToken = req.headers['x-internal-token'] as string;
    if (internalToken !== process.env.INTERNAL_SERVICE_TOKEN) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Akses ditolak.' } };
    }
    const data = await this.paymentService.processBulkRefund({
      eventId: payload.event_id,
      reason: payload.reason,
      triggeredBy: payload.triggered_by,
    });
    return { success: true, data };
  }

  @Get('me/transactions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Riwayat transaksi user' })
  async getTransactions(
    @CurrentUser() user: RequestUser,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('per_page') per_page?: number,
  ) {
    return this.paymentService.getTransactions(user.id, { status, page, per_page });
  }
}
