import { Controller, Get, Param } from '@nestjs/common';
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
}
