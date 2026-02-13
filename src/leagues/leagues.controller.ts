import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { LeaguesService } from './leagues.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { Roles } from 'src/auth/roles/roles.decorator';

@Controller('leagues')
export class LeaguesController {
    constructor(private leaguesService: LeaguesService){}

    // PUBLIC
    @Get()
    getLeagues(){
        return this.leaguesService.findAll();
    }

    // ADMIN ONLY
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Post()
    createLeague(
        @Body()
        body: {name: string, country: string, city: string},
        ) {
            return this.leaguesService.create(body);
        }
}
