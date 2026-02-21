import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SeasonCategoriesService {
    constructor(private prisma: PrismaService) {}

    findBySeason(seasonId: string) {
        return this.prisma.season_categories.findMany({
            where: {
                season_id: seasonId,
                is_active: true,
            },
            orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
        });
    }

    async create(data: {
        season_id: string;
        name: string;
        sort_order?: number;
    }) {
        const season = await this.prisma.seasons.findUnique({
            where: { id: data.season_id },
        });

        if (!season) {
            throw new BadRequestException('La temporada no existe');
        }

        const normalizedName = data.name?.trim().toUpperCase();
        if (!normalizedName) {
            throw new BadRequestException('El nombre de la categoria es requerido');
        }

        return this.prisma.season_categories.create({
            data: {
                season_id: data.season_id,
                name: normalizedName,
                sort_order: data.sort_order ?? 0,
                is_active: true,
            },
        });
    }
}
