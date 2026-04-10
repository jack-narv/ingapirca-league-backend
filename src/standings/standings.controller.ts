import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { StandingsService } from './standings.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { Roles } from 'src/auth/roles/roles.decorator';

@Controller('standings')
export class StandingsController {
    constructor(private standingsService: StandingsService) {}

    // PUBLIC - Standings by season (optional category)
    @Get('season/:seasonId')
    getBySeason(
        @Param('seasonId') seasonId: string,
        @Query('categoryId') categoryId?: string,
    ) {
        return this.standingsService.findBySeason(seasonId, categoryId);
    }

    // ADMIN ONLY - Manual recalculation
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Post('season/:seasonId/recalculate')
    recalculateSeason(
        @Param('seasonId') seasonId: string,
        @Query('categoryId') categoryId?: string,
    ) {
        return this.standingsService.recalculateSeasonStandings(seasonId, categoryId);
    }
}
