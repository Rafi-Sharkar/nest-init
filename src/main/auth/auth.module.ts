import { ENVEnum } from '@/common/enum/env.enum';
import { PrismaModule } from '@/lib/prisma/prisma.module';
import { RedisModule } from '@/lib/redis/redis.module';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MailModule } from '@/lib/mail/mail.module';

@Module({
  imports: [
    ConfigModule,
    MailModule,
    PrismaModule,
    RedisModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>(ENVEnum.JWT_SECRET),
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
