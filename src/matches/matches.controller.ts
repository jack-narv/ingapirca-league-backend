import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { MatchesService } from './matches.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { Roles } from 'src/auth/roles/roles.decorator';

@Controller('matches')
export class MatchesController {
    constructor(private matchesService: MatchesService){}

    //PUBLIC
    @Get('season/:seasonId')
    getBySeason(@Param('seasonId') seasonId:string){
        return this.matchesService.findBySeason(seasonId);
    }

    //ADMIN / LEAGUE_ADMIN
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'ADMIN_LEAGUE')
    @Post()
    createMatch(
        @Body()
        body: {
            season_id: string;
            home_team_id: string;
            away_team_id: string;
            venue_id: string;
            match_date: string;
            observations?: string;
        },
    ){
        return this.matchesService.createMatch({
            ...body,
            match_date: new Date(body.match_date),
        });
    }


    //ADMIN / LEAGUE_ADMIN
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'LEAGUE_ADMIN')
    @Patch(':id/finish')
    finishMatch(
        @Param('id') id:string,
        @Body()
        body: {
            home_score: number;
            away_score: number;
            observations?: string;
        },
    ) {
        return this.matchesService.finishMatch(
            id,
            body.home_score,
            body.away_score,
            body.observations,
        );
    }


    //ADMIN / LEAGUE_ADMIN
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'LEAGUE_ADMIN')
    @Patch(':id/cancel')
    cancelMatch(
        @Param('id') id: string,
        @Body() body: {observations?:string},
    ){
        return this.matchesService.cancelMatch(id, body.observations);
    }
}
