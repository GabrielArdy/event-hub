import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { QueueService } from '../../common/queue/queue.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

const LOGIN_MAX_ATTEMPTS = 5;
const BCRYPT_ROUNDS = 12;
const VERIFICATION_TOKEN_TTL_HOURS = 24;
const RESET_TOKEN_TTL_HOURS = 1;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private jwtService: JwtService,
    private config: ConfigService,
    private queue: QueueService,
  ) {}

  // ── Register (BR-AUTH-001, BR-AUTH-003) ────────────────────────────────────
  async register(dto: RegisterDto, ipAddress?: string) {
    if (dto.password !== dto.password_confirm) {
      throw new UnprocessableEntityException('PASSWORD_MISMATCH');
    }

    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('EMAIL_TAKEN');

    const user = await this.prisma.user.create({
      data: {
        fullName: dto.full_name,
        email: dto.email,
        passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
        role: dto.role,
        isVerified: false,
      },
    });

    // Create email verification token
    const tokenValue = randomUUID();
    const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_HOURS * 3600 * 1000);
    await this.prisma.verificationToken.create({
      data: { userId: user.id, token: tokenValue, type: 'EMAIL_VERIFICATION', expiresAt },
    });

    // Async: send verification email
    await this.queue.add('send-verification-email', {
      userId: user.id,
      email: user.email,
      token: tokenValue,
    });

    return {
      user_id: user.id,
      email: user.email,
      role: user.role,
      is_verified: false,
      created_at: user.createdAt.toISOString(),
    };
  }

  // ── Verify Email (BR-AUTH-003) ─────────────────────────────────────────────
  async verifyEmail(token: string) {
    const record = await this.prisma.verificationToken.findUnique({ where: { token } });

    if (!record || record.type !== 'EMAIL_VERIFICATION') {
      throw new UnauthorizedException('INVALID_TOKEN');
    }
    if (record.usedAt) {
      throw new ConflictException('ALREADY_DONE');
    }
    if (record.expiresAt < new Date()) {
      throw new HttpException('TOKEN_EXPIRED', HttpStatus.GONE);
    }

    const user = await this.prisma.user.findUnique({ where: { id: record.userId } });
    if (user?.isVerified) throw new ConflictException('ALREADY_DONE');

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { isVerified: true, verifiedAt: new Date() },
      }),
      this.prisma.verificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { user_id: record.userId, is_verified: true };
  }

  // ── Login (BR-AUTH-002, BR-AUTH-003) ───────────────────────────────────────
  async login(dto: LoginDto, ipAddress: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { organizer: true },
    });

    if (!user) {
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }

    // Check lockout before any further processing (BR-AUTH-002)
    const isLocked = await this.redis.isAccountLocked(user.id);
    if (isLocked) {
      const lockExpiry = await this.redis.getAccountLockExpiry(user.id);
      const exception = new HttpException('ACCOUNT_LOCKED', HttpStatus.LOCKED) as any;
      exception.lockUntil = lockExpiry;
      throw exception;
    }

    if (!user.isVerified) {
      throw new ForbiddenException('ACCOUNT_NOT_VERIFIED');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);

    // Record login attempt
    await this.prisma.loginAttempt.create({
      data: { userId: user.id, ipAddress, success: passwordValid },
    });

    if (!passwordValid) {
      const attempts = await this.redis.recordLoginAttempt(user.id);
      if (attempts >= LOGIN_MAX_ATTEMPTS) {
        await this.redis.lockAccount(user.id);
        await this.queue.add('send-login-alert', { userId: user.id, email: user.email });
        throw new HttpException('ACCOUNT_LOCKED', HttpStatus.LOCKED);
      }
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }

    await this.redis.clearLoginAttempts(user.id);

    const { accessToken, refreshToken, refreshTokenId } = await this.generateTokens(user);

    return {
      accessToken,
      refreshToken,
      user: {
        user_id: user.id,
        full_name: user.fullName,
        email: user.email,
        role: user.role,
        avatar_url: user.avatarUrl,
      },
    };
  }

  // ── Refresh Token ──────────────────────────────────────────────────────────
  async refreshToken(userId: string, oldTokenId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('INVALID_TOKEN');

    // Revoke old refresh token
    await this.prisma.refreshToken.update({
      where: { id: oldTokenId },
      data: { revokedAt: new Date() },
    });
    await this.redis.revokeRefreshToken(oldTokenId);

    const { accessToken } = await this.generateTokens(user);
    return { access_token: accessToken, expires_in: 900 };
  }

  // ── Logout ─────────────────────────────────────────────────────────────────
  async logout(userId: string, refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (stored) {
      await this.prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      });
      await this.redis.revokeRefreshToken(stored.id);
    }
  }

  // ── Forgot Password ────────────────────────────────────────────────────────
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Always return 200 to prevent email enumeration
    if (!user) return;

    const tokenValue = randomUUID();
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_HOURS * 3600 * 1000);

    await this.prisma.verificationToken.create({
      data: { userId: user.id, token: tokenValue, type: 'PASSWORD_RESET', expiresAt },
    });

    await this.queue.add('send-verification-email', {
      userId: user.id,
      email: user.email,
      token: tokenValue,
      type: 'PASSWORD_RESET',
    });
  }

  // ── Reset Password (BR-AUTH-004, BR-AUTH-005) ──────────────────────────────
  async resetPassword(token: string, password: string, passwordConfirm: string) {
    if (password !== passwordConfirm) {
      throw new UnprocessableEntityException('PASSWORD_MISMATCH');
    }

    const record = await this.prisma.verificationToken.findUnique({ where: { token } });

    if (!record || record.type !== 'PASSWORD_RESET') {
      throw new UnauthorizedException('INVALID_TOKEN');
    }
    if (record.usedAt) throw new UnauthorizedException('INVALID_TOKEN');
    if (record.expiresAt < new Date()) {
      throw new HttpException('TOKEN_EXPIRED', HttpStatus.GONE);
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      this.prisma.verificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      // BR-AUTH-005: revoke all refresh tokens
      this.prisma.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  // ── Get Profile ────────────────────────────────────────────────────────────
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { organizer: true },
    });
    if (!user) throw new NotFoundException('NOT_FOUND');

    return {
      user_id: user.id,
      full_name: user.fullName,
      email: user.email,
      role: user.role,
      avatar_url: user.avatarUrl,
      is_verified: user.isVerified,
      organizer: user.organizer
        ? {
            org_name: user.organizer.orgName,
            org_type: user.organizer.orgType,
            is_verified: user.organizer.isVerified,
            verified_at: user.organizer.verifiedAt?.toISOString() ?? null,
          }
        : null,
      created_at: user.createdAt.toISOString(),
    };
  }

  // ── Update Profile ─────────────────────────────────────────────────────────
  async updateMe(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.full_name && { fullName: dto.full_name }),
        ...(dto.avatar_url && { avatarUrl: dto.avatar_url }),
      },
    });

    return this.getMe(user.id);
  }

  // ── Organizer Apply (BR-AUTH-006) ──────────────────────────────────────────
  async applyOrganizer(
    userId: string,
    dto: { org_name: string; org_type: string; phone: string; event_category: string[] },
    docUrl: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { organizer: { include: { applications: { where: { status: 'PENDING' } } } } },
    });

    if (!user) throw new NotFoundException('NOT_FOUND');
    if (user.role === Role.ORGANIZER) {
      throw new UnprocessableEntityException('ALREADY_ORGANIZER');
    }
    if (user.organizer?.applications.length) {
      throw new UnprocessableEntityException('PENDING_APPLICATION');
    }

    let orgProfile = user.organizer;
    if (!orgProfile) {
      orgProfile = await this.prisma.orgProfile.create({
        data: {
          userId,
          orgName: dto.org_name,
          orgType: dto.org_type as any,
          phone: dto.phone,
        },
        include: { applications: true },
      });
    }

    const application = await this.prisma.orgApplication.create({
      data: { orgId: orgProfile.id, docUrl },
    });

    return {
      application_id: application.id,
      status: application.status,
      submitted_at: application.createdAt.toISOString(),
    };
  }

  // ── Private helpers ────────────────────────────────────────────────────────
  private async generateTokens(user: { id: string; role: Role; organizer?: any }) {
    const orgId = user.organizer?.id ?? null;
    const jti = randomUUID();

    const accessToken = this.jwtService.sign(
      { sub: user.id, role: user.role, org_id: orgId },
      {
        secret: this.config.get('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN', '15m'),
      },
    );

    const refreshTokenValue = this.jwtService.sign(
      { sub: user.id, jti },
      {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      },
    );

    const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);
    const stored = await this.prisma.refreshToken.create({
      data: { userId: user.id, token: refreshTokenValue, expiresAt },
    });

    return { accessToken, refreshToken: refreshTokenValue, refreshTokenId: stored.id };
  }
}
