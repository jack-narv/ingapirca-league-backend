import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SeasonsService {
    constructor(private prisma: PrismaService){}

    private defaultCategories(seasonId: string){
        return [
            { season_id: seasonId, name: 'MASTER', sort_order: 1 },
            { season_id: seasonId, name: 'SEGUNDA', sort_order: 2 },
            { season_id: seasonId, name: 'PRIMERA', sort_order: 3 },
            { season_id: seasonId, name: 'MAXIMA', sort_order: 4 },
        ];
    }

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
        return this.prisma.$transaction(async (tx) => {
            const season = await tx.seasons.create({
                data: {
                    league_id: data.league_id,
                    name: data.name,
                    start_date: new Date(data.start_date),
                    end_date: new Date(data.end_date),
                    status: 'PLANNED',
                },
            });

            await tx.season_categories.createMany({
                data: this.defaultCategories(season.id),
            });

            return season;
        });
    }

    findCategoriesBySeason(seasonId: string){
        return this.prisma.$transaction(async (tx) => {
            const count = await tx.season_categories.count({
                where: {season_id: seasonId},
            });

            if (count === 0) {
                await tx.season_categories.createMany({
                    data: this.defaultCategories(seasonId),
                });
            }

            return tx.season_categories.findMany({
                where: {
                    season_id: seasonId,
                    is_active: true,
                },
                orderBy: [
                    { sort_order: 'asc' },
                    { name: 'asc' },
                ],
            });
        });
    }

    async createCategory(data: {
        season_id: string;
        name: string;
        sort_order?: number;
    }){
        const season = await this.prisma.seasons.findUnique({
            where: {id: data.season_id},
        });

        if(!season){
            throw new BadRequestException('La temporada no existe');
        }

        return this.prisma.season_categories.create({
            data: {
                season_id: data.season_id,
                name: data.name.trim().toUpperCase(),
                sort_order: data.sort_order ?? 0,
            },
        });
    }
}
