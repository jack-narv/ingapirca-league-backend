import { Controller, Get, Param, Query } from '@nestjs/common';
import { StandingsService } from './standings.service';

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
}
