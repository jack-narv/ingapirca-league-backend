import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PlayerStatisticsController } from './player-statistics.controller';
import { PlayerStatisticsService } from './player-statistics.service';

@Module({
    imports: [PrismaModule],
    controllers: [PlayerStatisticsController],
    providers: [PlayerStatisticsService],
})
export class PlayerStatisticsModule {}
