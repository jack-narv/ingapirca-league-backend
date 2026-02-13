import { Controller,Get, Post, Body, Patch, Param, UseGuards } from '@nestjs/common';
import { RefereesService } from './referees.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { Roles } from 'src/auth/roles/roles.decorator';
import { AssignRefereeDto } from './dto/assign-referee.dto';
import { RateRefereeDto } from './dto/rate-referee.dto';

@Controller('referees')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN','LEAGUE_ADMIN')
export class RefereesController {
    constructor(private service: RefereesService){}

    @Post()
    create(@Body() body: any){
        return this.service.create(body);
    }

    @Get()
    findAll(){
        return this.service.findAll();
    }

    @Patch(':id/deactivate')
    deactivate(@Param('id') id:string){
        return this.service.deactivate(id);
    }

    @Post('assign')
    assign(@Body() body: AssignRefereeDto){
        return this.service.assignToMatch(body);
    }

    @Post('rate')
    rate(@Body() body: RateRefereeDto){
        return this.service.rateReferee(body);
    }

    @Patch('match-referees/:id/observation')
    submitObservation(
    @Param('id') id: string,
    @Body('observation') observation: string,
    ) {
        return this.service.submitObservation(id, observation);
    }

    @Get(':id/matches')
    getMatches(@Param('id') refereeId: string) {
        return this.service.getRefereeMatches(refereeId);
    }

    @Get(':id/average-rating')
    getAverage(@Param('id') refereeId: string) {
        return this.service.getAverageRating(refereeId);
    }

}
