import { Module } from '@nestjs/common';
import { MatchRefereeObservationsService } from './match-referee-observations.service';
import { MatchRefereeObservationsController } from './match-referee-observations.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    providers: [MatchRefereeObservationsService],
    controllers: [MatchRefereeObservationsController],
})
export class MatchRefereeObservationsModule {}
