import { Module } from '@nestjs/common';
import { MatchEventsController } from './match-events.controller';
import { MatchEventsService } from './match-events.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { LiveModule } from 'src/live/live.module';
import { SanctionsModule } from 'src/sanctions/sanctions.module';

@Module({
  imports: [PrismaModule, LiveModule, SanctionsModule],
  controllers: [MatchEventsController],
  providers: [MatchEventsService]
})
export class MatchEventsModule {}
