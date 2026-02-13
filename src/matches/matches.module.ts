import { Module } from '@nestjs/common';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { LiveModule } from 'src/live/live.module';

@Module({
  imports: [PrismaModule, LiveModule],
  controllers: [MatchesController],
  providers: [MatchesService]
})
export class MatchesModule {}
