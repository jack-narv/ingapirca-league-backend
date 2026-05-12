import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth/jwt-auth.guard';
import { Roles } from 'src/auth/roles/roles.decorator';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { VocaliaService } from './vocalia.service';

@Controller('vocalia')
export class VocaliaController {
    constructor(private service: VocaliaService) {}

    @Get('match/:matchId')
    getByMatch(@Param('matchId') matchId: string) {
        return this.service.getByMatch(matchId);
    }

    @Get(':id')
    getById(@Param('id') id: string) {
        return this.service.getById(id);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'LEAGUE_ADMIN', 'VOCAL')
    @Post('match/:matchId/team/:teamId/values')
    addValue(
        @Param('matchId') matchId: string,
        @Param('teamId') teamId: string,
        @Body()
        body: {
            concept: string;
            amount: number;
        },
    ) {
        return this.service.addValueToMatchTeam(matchId, teamId, body);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'LEAGUE_ADMIN', 'VOCAL')
    @Patch('match/:matchId/team/:teamId/values/:valueId')
    updateValue(
        @Param('matchId') matchId: string,
        @Param('teamId') teamId: string,
        @Param('valueId') valueId: string,
        @Body()
        body: {
            concept?: string;
            amount?: number;
        },
    ) {
        return this.service.updateValueInMatchTeam(
            matchId,
            teamId,
            valueId,
            body,
        );
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'LEAGUE_ADMIN', 'VOCAL')
    @Delete('match/:matchId/team/:teamId/values/:valueId')
    deleteValue(
        @Param('matchId') matchId: string,
        @Param('teamId') teamId: string,
        @Param('valueId') valueId: string,
    ) {
        return this.service.deleteValueInMatchTeam(matchId, teamId, valueId);
    }
}
