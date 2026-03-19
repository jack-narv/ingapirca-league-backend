import { Injectable, NotFoundException } from '@nestjs/common';
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

    async findById(seasonId: string){
        const season = await this.prisma.seasons.findUnique({
            where: { id: seasonId },
        });

        if(!season){
            throw new NotFoundException('Temporada no encontrada');
        }

        return season;
    }

    create(data: {
        league_id: string;
        name: string;
        start_date: string | Date;
        end_date: string | Date;
        two_yellows_matches_affected?: number;
        direct_red_matches_affected?: number;
        game_number_players?: number;
    }) {
        return this.prisma.seasons.create({
            data: {
                league_id: data.league_id,
                name: data.name,
                start_date: parseDateOnlyUtc(data.start_date),
                end_date: parseDateOnlyUtc(data.end_date),
                status: 'PLANNED',
                two_yellows_matches_affected:
                    data.two_yellows_matches_affected ?? 1,
                direct_red_matches_affected:
                    data.direct_red_matches_affected ?? 1,
                game_number_players: data.game_number_players ?? 11,
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
