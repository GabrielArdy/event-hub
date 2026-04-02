import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FastifyReply, FastifyRequest } from 'fastify';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshAuthGuard } from './guards/refresh-auth.guard';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60,
  path: '/api/v1/auth/refresh-token',
};

@ApiTags('Auth')
@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Daftarkan akun baru' })
  async register(@Body() dto: RegisterDto, @Req() req: FastifyRequest) {
    const data = await this.authService.register(dto, req.ip);
    return {
      success: true,
      message: 'Akun berhasil dibuat. Silakan cek email untuk verifikasi.',
      data,
    };
  }

  @Post('verify-email')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verifikasi email dengan token' })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    const data = await this.authService.verifyEmail(dto.token);
    return {
      success: true,
      message: 'Email berhasil diverifikasi. Akun Anda kini aktif.',
      data,
    };
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login dan dapatkan access token' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const result = await this.authService.login(dto, req.ip);
    res.setCookie('rt_token', result.refreshToken, REFRESH_COOKIE_OPTIONS);

    return {
      success: true,
      data: {
        access_token: result.accessToken,
        token_type: 'Bearer',
        expires_in: 900,
        user: result.user,
      },
    };
  }

  @Post('refresh-token')
  @Public()
  @UseGuards(RefreshAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Perbarui access token' })
  async refreshToken(@Req() req: FastifyRequest & { user: { id: string; tokenId: string } }) {
    const data = await this.authService.refreshToken(req.user.id, req.user.tokenId);
    return { success: true, data };
  }

  @Post('logout')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout dan revoke refresh token' })
  async logout(
    @CurrentUser() user: RequestUser,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const rt = req.cookies?.rt_token;
    if (rt) await this.authService.logout(user.id, rt);
    res.clearCookie('rt_token', { path: '/api/v1/auth/refresh-token' });
    return { success: true, message: 'Logout berhasil.' };
  }

  @Post('forgot-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Kirim email reset password' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    return {
      success: true,
      message: 'Jika email terdaftar, link reset password telah dikirim.',
    };
  }

  @Post('reset-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password dengan token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.password, dto.password_confirm);
    return {
      success: true,
      message: 'Password berhasil diubah. Silakan login kembali.',
    };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ambil profil pengguna aktif' })
  async getMe(@CurrentUser() user: RequestUser) {
    const data = await this.authService.getMe(user.id);
    return { success: true, data };
  }

  @Patch('me')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update profil pengguna' })
  async updateMe(@CurrentUser() user: RequestUser, @Body() dto: UpdateProfileDto) {
    const data = await this.authService.updateMe(user.id, dto);
    return { success: true, data };
  }
}
