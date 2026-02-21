import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { parseDateOnlyUtc } from 'src/date-time.util';

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
        start_date: string | Date;
        end_date: string | Date;
    }) {
        return this.prisma.seasons.create({
            data: {
                league_id: data.league_id,
                name: data.name,
                start_date: parseDateOnlyUtc(data.start_date),
                end_date: parseDateOnlyUtc(data.end_date),
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
