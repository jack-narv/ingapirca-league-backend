import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SeasonsService {
    constructor(private prisma: PrismaService){}

    findByLeague(leagueId: string){
        return this.prisma.seasons.findMany({
            where: {league_id: leagueId},
        });
    }

    create(data: {
        league_id: string;
        name: string;
        start_date: Date;
        end_date: Date;
    }) {
        return this.prisma.seasons.create({
            data: {
                league_id: data.league_id,
                name: data.name,
                start_date: new Date(data.start_date),
                end_date: new Date(data.end_date),
                status: 'PLANNED',
            },
        });
    }

    findCategoriesBySeason(seasonId: string){
        return this.prisma.season_categories.findMany({
            where: {
                season_id: seasonId,
                is_active: true,
            },
            orderBy: [
                { sort_order: 'asc' },
                { name: 'asc' },
            ],
        });
    }
}
