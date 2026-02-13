import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { MatchLineupsService } from './match-lineups.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { Roles } from 'src/auth/roles/roles.decorator';
import { CurrentUser } from 'src/auth/current-user/current-user.decorator';

@Controller('match-lineups')
export class MatchLineupsController {
    constructor(private service: MatchLineupsService){}

    //PUBLIC - View Lineup
    @Get(':matchId/team/:teamId')
    getLineup(
        @Param('matchId') matchId: string,
        @Param('teamId') teamId: string,
    ){
        return this.service.getLineup(matchId, teamId);
    }

    //Submit lineup
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'LEAGUE_ADMIN', 'TEAM_MANAGER')
    @Post()
    submitLineup(
        @CurrentUser() user:any,
        @Body()
        body: {
            match_id: string;
            team_id: string;
            players: {
                player_id: string;
                shirt_number: number;
                position: 'GK' | 'DF' | 'MF' |'FW'
                is_starting: boolean;
            }[];
        },
    ){
        return this.service.submitLineup(user.userId, body);
    }
}
