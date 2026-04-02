import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role, TicketStatus } from '@prisma/client';
import { TicketingService } from './ticketing.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { ValidateTicketDto } from './dto/validate-ticket.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Ticketing')
@Controller('tickets')
@UseGuards(JwtAuthGuard)
export class TicketingController {
  constructor(private readonly ticketingService: TicketingService) {}

  @Get('events')
  @Public()
  @ApiOperation({ summary: 'Daftar acara publik' })
  async getPublicEvents(
    @Query('q') q?: string,
    @Query('category') category?: string,
    @Query('city') city?: string,
    @Query('date_from') date_from?: string,
    @Query('date_to') date_to?: string,
    @Query('price_min') price_min?: number,
    @Query('price_max') price_max?: number,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('per_page') per_page?: number,
    @Query('sort') sort?: string,
  ) {
    return this.ticketingService.getPublicEvents({
      q, category, city, date_from, date_to,
      price_min, price_max, status, page, per_page, sort,
    });
  }

  @Get('events/:event_id')
  @Public()
  @ApiOperation({ summary: 'Detail acara publik' })
  async getPublicEvent(
    @Param('event_id') eventId: string,
    @CurrentUser() user?: RequestUser,
  ) {
    const data = await this.ticketingService.getPublicEvent(eventId, user?.id);
    return { success: true, data };
  }

  @Get('events/:event_id/seat-map')
  @Public()
  @ApiOperation({ summary: 'Snapshot real-time ketersediaan kursi' })
  async getSeatMap(@Param('event_id') eventId: string) {
    const data = await this.ticketingService.getSeatMap(eventId);
    return { success: true, data };
  }

  @Post('orders')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard)
  @Roles(Role.END_USER, Role.ADMIN)
  @ApiOperation({ summary: 'Buat order & kunci kursi' })
  async createOrder(@CurrentUser() user: RequestUser, @Body() dto: CreateOrderDto) {
    const data = await this.ticketingService.createOrder(user.id, dto);
    return { success: true, data };
  }

  @Get('orders/:order_id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Status detail order' })
  async getOrder(@CurrentUser() user: RequestUser, @Param('order_id') orderId: string) {
    const data = await this.ticketingService.getOrder(user.id, orderId);
    return { success: true, data };
  }

  @Get('me/tickets')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.END_USER, Role.ADMIN)
  @ApiOperation({ summary: 'Daftar tiket milik user' })
  async getMyTickets(
    @CurrentUser() user: RequestUser,
    @Query('status') status?: TicketStatus,
    @Query('page') page?: number,
    @Query('per_page') per_page?: number,
  ) {
    return this.ticketingService.getMyTickets(user.id, { status, page, per_page });
  }

  @Get('me/tickets/:ticket_id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Detail satu tiket' })
  async getMyTicket(
    @CurrentUser() user: RequestUser,
    @Param('ticket_id') ticketId: string,
  ) {
    const data = await this.ticketingService.getMyTicket(user.id, ticketId);
    return { success: true, data };
  }

  @Post(':ticket_id/validate')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.ORGANIZER, Role.STAFF, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validasi tiket QR di pintu masuk' })
  async validateTicket(
    @CurrentUser() user: RequestUser,
    @Param('ticket_id') ticketId: string,
    @Body() dto: ValidateTicketDto,
  ) {
    return this.ticketingService.validateTicket(user.id, ticketId, dto);
  }

  @Post('me/wishlist/:event_id')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.END_USER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle wishlist acara' })
  async toggleWishlist(
    @CurrentUser() user: RequestUser,
    @Param('event_id') eventId: string,
  ) {
    return this.ticketingService.toggleWishlist(user.id, eventId);
  }

  @Get('me/wishlist')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Daftar wishlist user' })
  async getWishlist(@CurrentUser() user: RequestUser) {
    return this.ticketingService.getWishlist(user.id);
  }
}
