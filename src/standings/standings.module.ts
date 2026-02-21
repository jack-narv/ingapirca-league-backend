import { Module } from '@nestjs/common';
import { StandingsService } from './standings.service';
import { StandingsController } from './standings.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports:[PrismaModule],
  providers: [StandingsService],
  controllers: [StandingsController]
})
export class StandingsModule {}
