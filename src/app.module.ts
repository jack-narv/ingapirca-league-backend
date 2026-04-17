import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health/health.controller';
import { AuthModule } from './auth/auth.module';
import { TeamsModule } from './teams/teams.module';
import { LeaguesModule } from './leagues/leagues.module';
import { SeasonsModule } from './seasons/seasons.module';
import { MatchesModule } from './matches/matches.module';
import { MatchLineupsModule } from './match-lineups/match-lineups.module';
import { PlayersModule } from './players/players.module';
import { MatchEventsModule } from './match-events/match-events.module';
import { LiveGateway } from './live/live.gateway';
import { LiveModule } from './live/live.module';
import { SanctionsModule } from './sanctions/sanctions.module';
import { RefereesModule } from './referees/referees.module';
import { VenuesModule } from './venues/venues.module';
import { MatchObservationsModule } from './match-observations/match-observations.module';
import { SeasonCategoriesModule } from './season-categories/season-categories.module';
import { StandingsModule } from './standings/standings.module';
import { RefereeRatingsModule } from './referee_ratings/referee_ratings.module';
import { MatchRefereeObservationsModule } from './match-referee-observations/match-referee-observations.module';
import { PlayerStatisticsModule } from './player-statistics/player-statistics.module';
import { VocaliaModule } from './vocalia/vocalia.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    TeamsModule,
    LeaguesModule,
    SeasonsModule,
    MatchesModule,
    MatchLineupsModule,
    PlayersModule,
    MatchEventsModule,
    LiveModule,
    SanctionsModule,
    RefereesModule,
    VenuesModule,
    MatchObservationsModule,
    SeasonCategoriesModule,
    StandingsModule,
    RefereeRatingsModule,
    MatchRefereeObservationsModule,
    PlayerStatisticsModule,
    VocaliaModule,
  ],
  controllers: [HealthController],
  providers: [LiveGateway],
})
export class AppModule {}
  
