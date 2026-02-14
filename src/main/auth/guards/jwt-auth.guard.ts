import { RedisService } from '@/lib/redis/redis.service';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing access token');
    }

    try {
      const payload = this.jwtService.verify(token) as {
        userId: string;
        role: string;
      };
      const isBlacklisted = await this.redis.exists(`blacklist:${token}`);

      if (isBlacklisted) {
        throw new UnauthorizedException('Access token revoked');
      }

      (request as Request & { user?: unknown }).user = payload;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid access token');
    }
  }

  private extractToken(request: Request) {
    const header = request.headers.authorization ?? '';
    const [type, token] = header.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
