import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { ErrorCode } from '../../common/constants/error-codes';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { JwtPayload } from '../../common/types';
import { USER_PUBLIC_SELECT } from '../users/lib/user-select';
import { PhoneLoginDto } from './dto/phone-login.dto';
import {
  LoginAttemptGuard,
  normalizeLoginPhoneKey,
} from './lib/login-attempt.guard';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly loginAttemptGuard: LoginAttemptGuard,
  ) {}

  async loginPhone(dto: PhoneLoginDto) {
    const phoneKey = normalizeLoginPhoneKey(dto.phone);
    this.loginAttemptGuard.assertNotLocked(phoneKey);

    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });

    if (!user) {
      this.handleFailedLogin(phoneKey);
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      this.handleFailedLogin(phoneKey);
    }

    if (!user.isActive) {
      throw new UnauthorizedException(ErrorCode.USER_INACTIVE);
    }

    this.loginAttemptGuard.reset(phoneKey);

    const tokens = await this.generateTokens(
      user.id,
      user.phone,
      user.roleId,
      dto.rememberMe === true,
    );

    const publicUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: USER_PUBLIC_SELECT,
    });

    return {
      user: publicUser,
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.refreshToken) {
        throw new UnauthorizedException(ErrorCode.INVALID_REFRESH_TOKEN);
      }

      if (!user.isActive) {
        throw new UnauthorizedException(ErrorCode.USER_INACTIVE);
      }

      const isValid = await bcrypt.compare(refreshToken, user.refreshToken);

      if (!isValid) {
        throw new UnauthorizedException(ErrorCode.INVALID_REFRESH_TOKEN);
      }

      return this.generateTokens(
        user.id,
        user.phone,
        user.roleId,
        payload.rememberMe !== false,
      );
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException(ErrorCode.INVALID_REFRESH_TOKEN);
    }
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });

    return { message: 'Logged out successfully' };
  }

  private async generateTokens(
    userId: string,
    phone: string,
    roleId: string,
    rememberMe: boolean,
  ) {
    const payload: JwtPayload = { sub: userId, phone, roleId, rememberMe };
    const expiresIn = (rememberMe ? '365d' : '30d') as `${number}${'s' | 'm' | 'h' | 'd'}`;

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn,
      jwtid: randomBytes(16).toString('hex'),
    });

    const hashedRefreshToken = await bcrypt.hash(refreshToken, BCRYPT_ROUNDS);

    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hashedRefreshToken },
    });

    return { accessToken, refreshToken };
  }

  private handleFailedLogin(phoneKey: string): never {
    const failure = this.loginAttemptGuard.recordFailure(phoneKey);

    if (failure.locked) {
      throw this.loginAttemptGuard.createLockedException(failure.retryAfterSeconds);
    }

    throw new UnauthorizedException(ErrorCode.INVALID_CREDENTIALS);
  }
}
