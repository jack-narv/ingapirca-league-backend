import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { MatchRefereeObservationsService } from './match-referee-observations.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { Roles } from 'src/auth/roles/roles.decorator';

@Controller('match-referee-observations')
export class MatchRefereeObservationsController {
    constructor(private service: MatchRefereeObservationsService) {}

    @Get()
    getAll(
        @Query('match_id') match_id?: string,
        @Query('referee_id') referee_id?: string,
        @Query('status') status?: 'DRAFT' | 'SUBMITTED' | 'REVIEWED',
        @Query('season_id') season_id?: string,
    ) {
        return this.service.getAll({ match_id, referee_id, status, season_id });
    }

    @Get('match/:matchId')
    getByMatch(@Param('matchId') matchId: string) {
        return this.service.getByMatch(matchId);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'LEAGUE_ADMIN')
    @Post()
    create(
        @Body()
        body: {
            match_id: string;
            referee_id: string;
            observation: string;
            status?: 'DRAFT' | 'SUBMITTED' | 'REVIEWED';
        },
    ) {
        return this.service.submitObservation(body);
    }
}
