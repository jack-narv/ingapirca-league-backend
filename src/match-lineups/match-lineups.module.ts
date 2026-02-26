import { Module } from '@nestjs/common';
import { MatchLineupsController } from './match-lineups.controller';
import { MatchLineupsService } from './match-lineups.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { SanctionsModule } from 'src/sanctions/sanctions.module';

@Module({
  imports:[PrismaModule, SanctionsModule],
  controllers: [MatchLineupsController],
  providers: [MatchLineupsService]
})
export class MatchLineupsModule {}
