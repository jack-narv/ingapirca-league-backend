import { Controller, Get, Param, Query } from '@nestjs/common';
import { PlayerStatisticsService } from './player-statistics.service';

@Controller('player-statistics')
export class PlayerStatisticsController {
    constructor(private playerStatisticsService: PlayerStatisticsService) {}

    @Get('season/:seasonId')
    getBySeason(
        @Param('seasonId') seasonId: string,
        @Query('categoryId') categoryId?: string,
    ) {
        return this.playerStatisticsService.findBySeason(seasonId, categoryId);
    }

    @Get('player/:playerId')
    getByPlayer(
        @Param('playerId') playerId: string,
        @Query('seasonId') seasonId?: string,
    ) {
        return this.playerStatisticsService.findByPlayer(playerId, seasonId);
    }

    @Get('season/:seasonId/top-scorers')
    getTopScorers(
        @Param('seasonId') seasonId: string,
        @Query('limit') limit?: string,
        @Query('categoryId') categoryId?: string,
    ) {
        return this.playerStatisticsService.topScorers(
            seasonId,
            this.parseLimit(limit),
            categoryId,
        );
    }

    @Get('season/:seasonId/scorers-summary')
    getScorersSummary(
        @Param('seasonId') seasonId: string,
        @Query('categoryId') categoryId?: string,
    ) {
        return this.playerStatisticsService.scorersSummary(
            seasonId,
            categoryId,
        );
    }

    @Get('season/:seasonId/top-cards')
    getTopCards(
        @Param('seasonId') seasonId: string,
        @Query('limit') limit?: string,
        @Query('categoryId') categoryId?: string,
    ) {
        return this.playerStatisticsService.topCards(
            seasonId,
            this.parseLimit(limit),
            categoryId,
        );
    }

    private parseLimit(limit?: string) {
        if (!limit) {
            return 10;
        }

        const parsed = Number(limit);
        return Number.isNaN(parsed) ? -1 : parsed;
    }
}
