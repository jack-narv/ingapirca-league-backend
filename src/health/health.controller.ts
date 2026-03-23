import { Controller, Get, UseGuards } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth/jwt-auth.guard';
import { CurrentUser } from 'src/auth/current-user/current-user.decorator';
import { ConfigService } from '@nestjs/config';

@Controller('health')
export class HealthController {
    constructor(
      private prisma: PrismaService,
      private readonly configService: ConfigService,
    ){

    }

    @Get('public')
    async publicHealth() {
        await this.prisma.$queryRaw`SELECT 1`;
        return {
          status: 'ok',
          app_update: {
            force_update: this.readBoolEnv('FORCE_UPDATE'),
            min_android_version: this.configService.get<string>('MIN_ANDROID_VERSION') ?? '',
            min_ios_version: this.configService.get<string>('MIN_IOS_VERSION') ?? '',
            android_store_url: this.configService.get<string>('ANDROID_STORE_URL') ?? '',
            ios_store_url: this.configService.get<string>('IOS_STORE_URL') ?? '',
          },
        };
    }

    @UseGuards(JwtAuthGuard)
    @Get()
    async health(@CurrentUser() user: any){
        await this.prisma.$queryRaw`SELECT 1`;
        return {status: 'ok', user};
    }

    private readBoolEnv(key: string): boolean {
      const rawValue = this.configService.get<string>(key);
      if (!rawValue) return false;
      const normalized = rawValue.trim().toLowerCase();
      return normalized === '1' || normalized === 'true' || normalized === 'yes';
    }
}
