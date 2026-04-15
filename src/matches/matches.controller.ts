import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { MatchesService } from './matches.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { Roles } from 'src/auth/roles/roles.decorator';
import { parseEcuadorDateTimeToUtc } from 'src/date-time.util';

@Controller('matches')
export class MatchesController {
    constructor(private matchesService: MatchesService){}

    //PUBLIC
    @Get('season/:seasonId')
    getBySeason(
        @Param('seasonId') seasonId:string,
        @Query('categoryId') categoryId?: string,
    ){
        return this.matchesService.findBySeason(seasonId, categoryId);
    }

    @Get(':id')
    getById(@Param('id') id: string){
        return this.matchesService.findById(id);
    }

    //ADMIN / LEAGUE_ADMIN
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'LEAGUE_ADMIN')
    @Post()
    createMatch(
        @Body()
        body: {
            season_id: string;
            category_id?: string;
            journal: string;
            home_team_id: string;
            away_team_id: string;
            venue_id: string;
            match_date: string;
            observations?: string;
        },
    ){
        return this.matchesService.createMatch({
            ...body,
            match_date: parseEcuadorDateTimeToUtc(body.match_date),
        });
    }


    //ADMIN / LEAGUE_ADMIN
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'LEAGUE_ADMIN', 'VOCAL')
    @Patch(':id/start')
    startMatch(@Param('id') id: string) {
        return this.matchesService.startMatch(id);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'LEAGUE_ADMIN', 'VOCAL')
    @Patch(':id/half-time')
    endFirstHalf(@Param('id') id: string) {
        return this.matchesService.endFirstHalf(id);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'LEAGUE_ADMIN', 'VOCAL')
    @Patch(':id/second-half')
    startSecondHalf(@Param('id') id: string) {
        return this.matchesService.startSecondHalf(id);
    }


    //ADMIN / LEAGUE_ADMIN
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'LEAGUE_ADMIN', 'VOCAL')
    @Patch(':id/finish')
    finishMatch(
        @Param('id') id:string,
        @Body()
        body: {
            home_score: number;
            away_score: number;
            observations?: string;
            best_player_id?: string;
            best_goalkeeper_id?: string;
        },
    ) {
        return this.matchesService.finishMatch(
            id,
            body.home_score,
            body.away_score,
            body.observations,
            body.best_player_id,
            body.best_goalkeeper_id,
        );
    }


    //ADMIN / LEAGUE_ADMIN
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'LEAGUE_ADMIN', 'VOCAL')
    @Patch(':id/cancel')
    cancelMatch(
        @Param('id') id: string,
        @Body() body: {observations?:string},
    ){
        return this.matchesService.cancelMatch(id, body.observations);
    }
}
