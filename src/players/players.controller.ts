import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { PlayersService } from './players.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { Roles } from 'src/auth/roles/roles.decorator';

@Controller('players')
export class PlayersController {
    constructor(private service: PlayersService){}

    //PUBLIC
    getAll(){
        return this.service.findAll();
    }


    //PUBLIC
    @Get(':id')
    getOne(@Param('id') id: string){
        return this.service.findOne(id);
    }

    //CREATE PLAYER
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'LEAGUE_ADMIN')
    @Post()
    create(
        @Body()
        body:{
            first_name: string;
            last_name: string;
            date_of_birth: string;
            nationality: string;
            photo_url?: string
        },
    ){
        return this.service.createPlayer(body);
    }


    //ASSIGN TO TEAM
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN','LEAGUE_ADMIN')
    @Post('assign')
    assign(
        @Body()
        body:{
            player_id:string;
            team_id:string;
            shirt_number: number;
            position: 'GK' | 'DF' | 'MF' | 'FW'
        },
    ){
        return this.service.assignToTeam(body);
    }


    //RELEASE PLAYER
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'LEAGUE_ADMIN')
    @Patch('release/:teamPlayerId')
    release(@Param('teamPlayerId') id: string){
        return this.service.releaseFromTeam(id);
    }
}
