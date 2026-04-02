import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EventStatus, LayoutType, Role } from '@prisma/client';
import { OrganizerService } from './organizer.service';
import { CreateEventDto } from './dto/create-event.dto';
import { CreateTicketTypeDto } from './dto/create-ticket-type.dto';
import { UpdateTicketTypeDto } from './dto/update-ticket-type.dto';
import { SetPaymentConfigDto } from './dto/set-payment-config.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { IsString, MaxLength } from 'class-validator';

class CancelEventDto {
  @IsString()
  @MaxLength(500)
  reason: string;
}

class PostponeEventDto {
  new_start_at: string;
  new_end_at: string;
  @IsString()
  @MaxLength(500)
  reason: string;
}

@ApiTags('Organizer')
@ApiBearerAuth()
@Controller('organizer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ORGANIZER, Role.ADMIN)
export class OrganizerController {
  constructor(private readonly organizerService: OrganizerService) {}

  @Post('events')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Buat draft acara baru' })
  async createEvent(@CurrentUser() user: RequestUser, @Body() dto: CreateEventDto) {
    const data = await this.organizerService.createEvent(user.orgId!, dto);
    return { success: true, data };
  }

  @Get('events')
  @ApiOperation({ summary: 'Daftar semua acara EO' })
  async listEvents(
    @CurrentUser() user: RequestUser,
    @Query('status') status?: EventStatus,
    @Query('page') page?: number,
    @Query('per_page') per_page?: number,
    @Query('sort') sort?: string,
    @Query('order') order?: string,
  ) {
    return this.organizerService.listEvents(user.orgId!, { status, page, per_page, sort, order });
  }

  @Get('events/:event_id')
  @ApiOperation({ summary: 'Detail acara EO' })
  async getEvent(@CurrentUser() user: RequestUser, @Param('event_id') eventId: string) {
    const data = await this.organizerService.getEvent(user.orgId!, eventId);
    return { success: true, data };
  }

  @Patch('events/:event_id')
  @ApiOperation({ summary: 'Update informasi acara' })
  async updateEvent(
    @CurrentUser() user: RequestUser,
    @Param('event_id') eventId: string,
    @Body() dto: Partial<CreateEventDto>,
  ) {
    const { data, warnings } = await this.organizerService.updateEvent(user.orgId!, eventId, dto);
    return { success: true, data, warnings };
  }

  @Delete('events/:event_id')
  @ApiOperation({ summary: 'Hapus acara (hanya DRAFT)' })
  async deleteEvent(@CurrentUser() user: RequestUser, @Param('event_id') eventId: string) {
    await this.organizerService.deleteEvent(user.orgId!, eventId);
    return { success: true, message: 'Acara berhasil dihapus.' };
  }

  @Post('events/:event_id/publish')
  @ApiOperation({ summary: 'Publikasikan acara' })
  async publishEvent(@CurrentUser() user: RequestUser, @Param('event_id') eventId: string) {
    const data = await this.organizerService.publishEvent(user.orgId!, eventId);
    return { success: true, data };
  }

  @Post('events/:event_id/cancel')
  @ApiOperation({ summary: 'Batalkan acara (trigger bulk refund)' })
  async cancelEvent(
    @CurrentUser() user: RequestUser,
    @Param('event_id') eventId: string,
    @Body() dto: CancelEventDto,
  ) {
    const data = await this.organizerService.cancelEvent(user.orgId!, eventId, dto.reason);
    return { success: true, data };
  }

  @Post('events/:event_id/postpone')
  @ApiOperation({ summary: 'Tunda acara ke tanggal baru' })
  async postponeEvent(
    @CurrentUser() user: RequestUser,
    @Param('event_id') eventId: string,
    @Body() dto: PostponeEventDto,
  ) {
    const data = await this.organizerService.postponeEvent(
      user.orgId!,
      eventId,
      dto.new_start_at,
      dto.new_end_at,
      dto.reason,
    );
    return { success: true, data };
  }

  @Post('events/:event_id/layout')
  @ApiOperation({ summary: 'Simpan konfigurasi layout venue' })
  async setLayout(
    @CurrentUser() user: RequestUser,
    @Param('event_id') eventId: string,
    @Body() dto: { type: LayoutType; data: any },
  ) {
    const data = await this.organizerService.setLayout(user.orgId!, eventId, dto);
    return { success: true, data };
  }

  @Post('events/:event_id/tickets')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tambah jenis tiket baru' })
  async addTicketType(
    @CurrentUser() user: RequestUser,
    @Param('event_id') eventId: string,
    @Body() dto: CreateTicketTypeDto,
  ) {
    const data = await this.organizerService.addTicketType(user.orgId!, eventId, dto);
    return { success: true, data };
  }

  @Patch('events/:event_id/tickets/:ticket_type_id')
  @ApiOperation({ summary: 'Update jenis tiket' })
  async updateTicketType(
    @CurrentUser() user: RequestUser,
    @Param('event_id') eventId: string,
    @Param('ticket_type_id') ticketTypeId: string,
    @Body() dto: UpdateTicketTypeDto,
  ) {
    const data = await this.organizerService.updateTicketType(
      user.orgId!,
      eventId,
      ticketTypeId,
      dto,
    );
    return { success: true, data };
  }

  @Post('events/:event_id/payment-config')
  @ApiOperation({ summary: 'Atur konfigurasi pembayaran' })
  async setPaymentConfig(
    @CurrentUser() user: RequestUser,
    @Param('event_id') eventId: string,
    @Body() dto: SetPaymentConfigDto,
  ) {
    const data = await this.organizerService.setPaymentConfig(user.orgId!, eventId, dto);
    return { success: true, data };
  }

  @Get('events/:event_id/report')
  @ApiOperation({ summary: 'Laporan penjualan tiket & keuangan' })
  async getReport(
    @CurrentUser() user: RequestUser,
    @Param('event_id') eventId: string,
    @Query('include_transactions') includeTransactions?: boolean,
  ) {
    const data = await this.organizerService.getReport(user.orgId!, eventId, includeTransactions);
    return { success: true, data };
  }

  @Get('events/:event_id/attendees')
  @ApiOperation({ summary: 'Daftar peserta yang sudah check-in' })
  async getAttendees(
    @CurrentUser() user: RequestUser,
    @Param('event_id') eventId: string,
    @Query('page') page?: number,
    @Query('per_page') per_page?: number,
  ) {
    return this.organizerService.getAttendees(user.orgId!, eventId, { page, per_page });
  }
}
