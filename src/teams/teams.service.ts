import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TeamsService {
    constructor(private prisma: PrismaService){

    }  

    async findAllBySeason(seasonId: string){
        return this.prisma.teams.findMany({
            where: {season_id: seasonId},
        });
    }

    async createTeam(data:{
        season_id: string;
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

        const existing = await this.prisma.teams.findFirst({
            where: {
                season_id: data.season_id,
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
