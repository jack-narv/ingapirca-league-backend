import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth/jwt-auth.guard';
import { Roles } from 'src/auth/roles/roles.decorator';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { SanctionsService } from './sanctions.service';

@Controller('sanctions')
export class SanctionsController {
  constructor(private readonly sanctionsService: SanctionsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'LEAGUE_ADMIN', 'TEAM_MANAGER')
  @Get('suspended-players/:matchId/team/:teamId')
  getSuspendedPlayers(
    @Param('matchId') matchId: string,
    @Param('teamId') teamId: string,
  ) {
    return this.sanctionsService.getSuspendedPlayersForMatch(matchId, teamId);
  }
}
