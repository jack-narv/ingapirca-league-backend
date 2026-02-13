import { Controller, Get, UseGuards } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth/jwt-auth.guard';
import { CurrentUser } from 'src/auth/current-user/current-user.decorator';

@Controller('health')
export class HealthController {
    constructor(private prisma: PrismaService){

    }

    @UseGuards(JwtAuthGuard)
    @Get()
    async health(@CurrentUser() user: any){
        await this.prisma.$queryRaw`SELECT 1`;
        return {status: 'ok', user};
    }
}
