import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { RefereeRatingsService } from './referee_ratings.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { Roles } from 'src/auth/roles/roles.decorator';
import { CreateRefereeRatingDto } from './dto/create-referee-rating.dto';

@Controller('referee-ratings')
export class RefereeRatingsController {
    constructor(private service: RefereeRatingsService) {}

    @Get()
    getAll(
        @Query('match_id') match_id?: string,
        @Query('referee_id') referee_id?: string,
        @Query('team_id') team_id?: string,
        @Query('season_id') season_id?: string,
    ) {
        return this.service.getAll({ match_id, referee_id, team_id, season_id });
    }

    @Get('match/:matchId')
    getByMatch(@Param('matchId') matchId: string) {
        return this.service.getByMatch(matchId);
    }

    @Get('referee/:refereeId/average')
    getAverageByReferee(@Param('refereeId') refereeId: string) {
        return this.service.getAverageByReferee(refereeId);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'LEAGUE_ADMIN')
    @Post()
    create(@Body() body: CreateRefereeRatingDto) {
        return this.service.create(body);
    }
}
