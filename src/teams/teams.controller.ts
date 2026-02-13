import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { Roles } from 'src/auth/roles/roles.decorator';

@Controller('teams')
export class TeamsController {
    constructor(private teamService: TeamsService){}

    //PUBLIC - View teams by season
    @Get('season/:seasonId')
    async getTeams(@Param('seasonId') seasonId:string){
        return this.teamService.findAllBySeason(seasonId);
    }

    // LEAGUE_ADMIN ONLY - Create Team
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN','LEAGUE_ADMIN')
    @Post()
    async createTeam(
        @Body()
        body: {
            season_id: string;
            name:string;
            founded_year?: number;
            logo_url?: string;
        },
    ) {
        return this.teamService.createTeam(body);
    }

}
