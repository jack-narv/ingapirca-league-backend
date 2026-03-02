import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { MatchObservationsService } from './match-observations.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { Roles } from 'src/auth/roles/roles.decorator';
import { CurrentUser } from 'src/auth/current-user/current-user.decorator';

@Controller('match-observations')
export class MatchObservationsController {
    constructor(private service: MatchObservationsService) {}

    // PUBLIC - All observations (with optional filters)
    @Get()
    getAll(
        @Query('match_id') match_id?: string,
        @Query('team_id') team_id?: string,
        @Query('status') status?: 'DRAFT' | 'SUBMITTED' | 'REVIEWED',
    ) {
        return this.service.getAll({ match_id, team_id, status });
    }

    // PUBLIC - All observations for one match
    @Get('match/:matchId')
    getByMatch(@Param('matchId') matchId: string) {
        return this.service.getByMatch(matchId);
    }

    // ADMIN - Add team observation from player input
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'VOCAL')
    @Post()
    create(
        @CurrentUser() user: any,
        @Body()
        body: {
            match_id: string;
            team_id: string;
            submitted_by: string;
            observation: string;
            status?: 'DRAFT' | 'SUBMITTED' | 'REVIEWED';
        },
    ) {
        // user.userId is read to keep parity with controller patterns where actor is available
        void user?.userId;
        return this.service.submitObservation(body);
    }
}
