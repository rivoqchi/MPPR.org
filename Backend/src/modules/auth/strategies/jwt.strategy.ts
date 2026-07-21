import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { ErrorCode } from '../../../common/constants/error-codes';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { JwtPayload, AuthenticatedUser } from '../../../common/types';

function extractJwtFromRequest(req: Request): string | null {
  const fromHeader = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
  if (fromHeader) {
    return fromHeader;
  }

  const queryToken = req.query?.access_token;
  return typeof queryToken === 'string' && queryToken.length > 0 ? queryToken : null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: extractJwtFromRequest,
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, phone: true, roleId: true, isActive: true },
    });

    if (!user) {
      throw new UnauthorizedException(ErrorCode.USER_NOT_FOUND);
    }

    if (!user.isActive) {
      throw new UnauthorizedException(ErrorCode.USER_INACTIVE);
    }

    return user;
  }
}
