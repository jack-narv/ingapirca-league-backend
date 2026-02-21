import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { SeasonCategoriesService } from './season-categories.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { Roles } from 'src/auth/roles/roles.decorator';

@Controller('season-categories')
export class SeasonCategoriesController {
    constructor(private service: SeasonCategoriesService) {}

    // PUBLIC
    @Get('season/:seasonId')
    getBySeason(@Param('seasonId') seasonId: string) {
        return this.service.findBySeason(seasonId);
    }

    // ADMIN
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Post()
    create(
        @Body()
        body: {
            season_id: string;
            name: string;
            sort_order?: number;
        },
    ) {
        return this.service.create(body);
    }
}
