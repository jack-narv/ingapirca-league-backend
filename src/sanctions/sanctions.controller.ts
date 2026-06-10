import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth/jwt-auth.guard';
import { Roles } from 'src/auth/roles/roles.decorator';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { SanctionsService } from './sanctions.service';

@Controller('sanctions')
export class SanctionsController {
  constructor(private readonly sanctionsService: SanctionsService) {}

  @Get('overview/season/:seasonId')
  getSeasonOverview(
    @Param('seasonId') seasonId: string,
    @Query('categoryId') categoryId?: string,
    @Query('teamId') teamId?: string,
  ) {
    return this.sanctionsService.getSeasonOverview(
      seasonId,
      categoryId,
      teamId,
    );
  }

  @Get('suspensions-summary/season/:seasonId')
  getSuspensionsSummary(
    @Param('seasonId') seasonId: string,
    @Query('categoryId') categoryId?: string,
    @Query('teamId') teamId?: string,
  ) {
    return this.sanctionsService.getSuspensionsSummaryBySeason(
      seasonId,
      categoryId,
      teamId,
    );
  }

  @Get('cards-summary/season/:seasonId')
  getCardsSummary(
    @Param('seasonId') seasonId: string,
    @Query('categoryId') categoryId?: string,
    @Query('teamId') teamId?: string,
  ) {
    return this.sanctionsService.getCardsSummaryBySeason(
      seasonId,
      categoryId,
      teamId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'LEAGUE_ADMIN', 'TEAM_MANAGER', 'VOCAL')
  @Get('suspended-players/:matchId/team/:teamId')
  getSuspendedPlayers(
    @Param('matchId') matchId: string,
    @Param('teamId') teamId: string,
  ) {
    return this.sanctionsService.getSuspendedPlayersForMatch(matchId, teamId);
  }
}
