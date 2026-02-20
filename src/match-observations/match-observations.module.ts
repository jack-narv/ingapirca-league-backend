import { Module } from '@nestjs/common';
import { MatchObservationsService } from './match-observations.service';
import { MatchObservationsController } from './match-observations.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [MatchObservationsService],
  controllers: [MatchObservationsController]
})
export class MatchObservationsModule {}
