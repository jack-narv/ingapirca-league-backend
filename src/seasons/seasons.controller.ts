import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { SeasonsService } from './seasons.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { Roles } from 'src/auth/roles/roles.decorator';

@Controller('seasons')
export class SeasonsController {
    constructor(private seasonService: SeasonsService){}

    //PUBLIC
    @Get('league/:leagueId')
    getByLeague(@Param('leagueId') leagueId: string){
        return this.seasonService.findByLeague(leagueId);
    }

    //PUBLIC
    @Get(':seasonId/categories')
    getCategories(@Param('seasonId') seasonId: string){
        return this.seasonService.findCategoriesBySeason(seasonId);
    }

    // ADMIN / LEAGUE_ADMIN
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'LEAGUE_ADMIN')
    @Post()
    createSeason(
        @Body()
        body:{
            league_id: string;
            name: string;
            start_date: string;
            end_date: string;
        },
    ) {
        return this.seasonService.create(body);
    }
}
