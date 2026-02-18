import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TeamsService {
    constructor(private prisma: PrismaService){

    }  

    async findAllBySeason(seasonId: string, categoryId?: string){
        return this.prisma.teams.findMany({
            where: {
                season_id: seasonId,
                ...(categoryId ? { category_id: categoryId } : {}),
            },
        });
    }

    async createTeam(data:{
        season_id: string;
        category_id?: string;
        name: string;
        founded_year?: number;
        logo_url?: string;
    }) {
        const season = await this.prisma.seasons.findUnique({
            where: { id: data.season_id },
        });

        if (!season) {
            throw new BadRequestException('La temporada no existe');
        }

        if (data.category_id) {
            const category = await this.prisma.season_categories.findFirst({
                where: {
                    id: data.category_id,
                    season_id: data.season_id,
                },
            });

            if (!category) {
                throw new BadRequestException('La categoria no existe en la temporada');
            }
        }

        const existing = await this.prisma.teams.findFirst({
            where: {
                season_id: data.season_id,
                category_id: data.category_id ?? null,
                name: data.name,
            },
        });

        if (existing) {
            throw new BadRequestException(
                'En equipo con ese nombre ya existe en la actual temporada',
            );
        }

        return this.prisma.teams.create({data});
    }
}
