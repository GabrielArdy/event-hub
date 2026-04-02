import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { FastifyRequest } from 'fastify';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { RedisService } from '../../../common/redis/redis.service';

@Injectable()
export class RefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private redis: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: FastifyRequest) => req.cookies?.rt_token ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(req: FastifyRequest, payload: { sub: string; jti: string }) {
    const token = req.cookies?.rt_token;
    if (!token) throw new UnauthorizedException('MISSING_TOKEN');

    // Check if revoked
    const revoked = await this.redis.isRefreshTokenRevoked(payload.jti);
    if (revoked) throw new UnauthorizedException('INVALID_TOKEN');

    const stored = await this.prisma.refreshToken.findUnique({ where: { token } });
    if (!stored || stored.revokedAt) throw new UnauthorizedException('INVALID_TOKEN');
    if (stored.expiresAt < new Date()) throw new UnauthorizedException('TOKEN_EXPIRED');

    return { id: payload.sub, tokenId: stored.id };
  }
}
