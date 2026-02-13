import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { MatchEventsService } from './match-events.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { Roles } from 'src/auth/roles/roles.decorator';

@Controller('match-events')
export class MatchEventsController {
    constructor(private service: MatchEventsService){}

    //PUBLIC - Match timeline
    @Get('match/:matchId')
    getTimeline(@Param('matchId') matchId: string){
        return this.service.getByMatch(matchId);
    }

    //Add event ADMIN / LEAGUE_ADMIN
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'LEAGUE_ADMIN')
    @Post()
    create(
        @Body()
        body: {
            match_id: string;
            team_id: string;
            player_id: string;
            minute: number;
            event_type:
                | 'GOAL'
                | 'YELLOW'
                | 'RED'
                | 'SUB_IN'
                | 'SUB_OUT'
                | 'OWN_GOAL'
            related_player_id?: string;
        },
    ){
        return this.service.createEvent(body);
    }
}
