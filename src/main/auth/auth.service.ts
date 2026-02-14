import { ENVEnum } from '@/common/enum/env.enum';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { RedisService } from '@/lib/redis/redis.service';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserAccountStatus, UserRole } from '@prisma';
import * as argon2 from 'argon2';
import { randomUUID } from 'crypto';
import {
  ForgotPasswordDto,
  LoginDto,
  LogoutDto,
  RefreshTokenDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyOtpDto,
} from './dto';

type JwtAccessPayload = {
  userId: string;
  role: UserRole;
};

type JwtRefreshPayload = {
  userId: string;
  tokenVersion: number;
  tokenId: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();

    const orConditions = [
      { email },
      { username: dto.username },
      ...(dto.phone ? [{ phone: dto.phone }] : []),
    ];

    const existing = await this.prisma.client.user.findFirst({
      where: {
        OR: orConditions,
      },
    });

    if (existing) {
      throw new ConflictException('User already exists');
    }

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.client.user.create({
      data: {
        email,
        username: dto.username,
        fullName: dto.fullName?.trim() || null,
        phone: dto.phone ?? null,
        passwordHash,
        role: UserRole.CLIENT,
        accountStatus: UserAccountStatus.PENDING,
        isVerified: false,
      },
    });

    const otp = this.generateOtp();
    await this.redis.set(this.otpKey(email), otp, 300);

    console.info(`OTP for ${email}: ${otp}`);

    return {
      userId: user.id,
      email: user.email,
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const email = dto.email.toLowerCase();
    const user = await this.prisma.client.user.findUnique({ where: { email } });

    if (!user) {
      throw new BadRequestException('Invalid OTP');
    }

    const storedOtp = await this.redis.get(this.otpKey(email));
    if (!storedOtp || storedOtp !== dto.otp) {
      throw new BadRequestException('Invalid OTP');
    }

    await this.prisma.client.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        accountStatus: UserAccountStatus.ACTIVE,
      },
    });

    await this.redis.del(this.otpKey(email));

    return { verified: true };
  }

  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase();
    const user = await this.prisma.client.user.findUnique({ where: { email } });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isVerified) {
      throw new UnauthorizedException('Account not verified');
    }

    const isValid = await argon2.verify(user.passwordHash, dto.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.issueTokens(
      user.id,
      user.role,
      user.tokenVersion,
    );

    await this.prisma.client.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    return tokens;
  }

  async refresh(dto: RefreshTokenDto) {
    const payload = this.verifyRefreshToken(dto.refreshToken);

    const user = await this.prisma.client.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (user.tokenVersion !== payload.tokenVersion) {
      await this.revokeAllSessions(user.id);
      throw new UnauthorizedException('Refresh token revoked');
    }

    const key = this.refreshKey(payload.userId, payload.tokenId);
    const exists = await this.redis.exists(key);

    if (!exists) {
      await this.revokeAllSessions(user.id);
      throw new UnauthorizedException('Refresh token reused');
    }

    await this.redis.del(key);

    return this.issueTokens(user.id, user.role, user.tokenVersion);
  }

  async logout(dto: LogoutDto) {
    const payload = this.verifyRefreshToken(dto.refreshToken);
    const key = this.refreshKey(payload.userId, payload.tokenId);
    await this.redis.del(key);

    if (dto.accessToken) {
      await this.blacklistAccessToken(dto.accessToken);
    }

    return { loggedOut: true };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const email = dto.email.toLowerCase();
    const user = await this.prisma.client.user.findUnique({ where: { email } });

    if (user) {
      const resetToken = randomUUID();
      await this.redis.set(this.resetKey(user.id), resetToken, 600);
      console.info(`Password reset token for ${email}: ${resetToken}`);
    }

    return { sent: true };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const email = dto.email.toLowerCase();
    const user = await this.prisma.client.user.findUnique({ where: { email } });

    if (!user) {
      throw new BadRequestException('Invalid reset token');
    }

    const storedToken = await this.redis.get(this.resetKey(user.id));
    if (!storedToken || storedToken !== dto.resetToken) {
      throw new BadRequestException('Invalid reset token');
    }

    const passwordHash = await argon2.hash(dto.newPassword);
    await this.prisma.client.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    await this.redis.del(this.resetKey(user.id));
    await this.revokeAllSessions(user.id);

    return { reset: true };
  }

  private verifyRefreshToken(token: string): JwtRefreshPayload {
    try {
      return this.jwtService.verify<JwtRefreshPayload>(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async issueTokens(
    userId: string,
    role: UserRole,
    tokenVersion: number,
  ) {
    const accessPayload: JwtAccessPayload = { userId, role };
    const refreshPayload: JwtRefreshPayload = {
      userId,
      tokenVersion,
      tokenId: randomUUID(),
    };

    const accessExpiresIn =
      this.configService.get<string>(ENVEnum.ACCESS_TOKEN_EXPIRES_IN) ?? '15m';
    const refreshExpiresIn =
      this.configService.get<string>(ENVEnum.REFRESH_TOKEN_EXPIRES_IN) ?? '7d';
    const accessExpiresSeconds = this.parseDurationToSeconds(accessExpiresIn);
    const refreshExpiresSeconds = this.parseDurationToSeconds(refreshExpiresIn);

    const accessToken = this.jwtService.sign(accessPayload, {
      expiresIn: accessExpiresSeconds,
    });
    const refreshToken = this.jwtService.sign(refreshPayload, {
      expiresIn: refreshExpiresSeconds,
    });

    await this.redis.set(
      this.refreshKey(userId, refreshPayload.tokenId),
      '1',
      refreshExpiresSeconds,
    );

    return { accessToken, refreshToken };
  }

  private async blacklistAccessToken(token: string) {
    const decoded = this.jwtService.decode(token) as { exp?: number } | null;
    const now = Math.floor(Date.now() / 1000);
    const ttl = decoded?.exp ? Math.max(decoded.exp - now, 1) : 900;
    await this.redis.set(this.blacklistKey(token), '1', ttl);
  }

  private async revokeAllSessions(userId: string) {
    await this.prisma.client.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    });

    const keys = await this.redis.scanKeys(this.refreshKey(userId, '*'));
    if (keys.length > 0) {
      const client = this.redis.getClient();
      await client.del(...keys);
    }
  }

  private generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private otpKey(email: string) {
    return `otp:${email}`;
  }

  private refreshKey(userId: string, tokenId: string) {
    return `refresh:${userId}:${tokenId}`;
  }

  private resetKey(userId: string) {
    return `reset:${userId}`;
  }

  private blacklistKey(token: string) {
    return `blacklist:${token}`;
  }

  private parseDurationToSeconds(value: string) {
    const trimmed = value.trim();
    const match = trimmed.match(/^(\d+)([smhd])?$/i);

    if (!match) {
      return 0;
    }

    const amount = Number(match[1]);
    const unit = (match[2] ?? 's').toLowerCase();

    switch (unit) {
      case 'm':
        return amount * 60;
      case 'h':
        return amount * 60 * 60;
      case 'd':
        return amount * 60 * 60 * 24;
      default:
        return amount;
    }
  }
}
