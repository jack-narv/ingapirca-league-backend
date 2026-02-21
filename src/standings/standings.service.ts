import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class StandingsService {
    constructor(private prisma: PrismaService) {}

    async findBySeason(seasonId: string, categoryId?: string) {
        const rows = await this.prisma.standings.findMany({
            where: {
                season_id: seasonId,
                ...(categoryId ? { teams: { category_id: categoryId } } : {}),
            },
            include: {
                teams: {
                    select: {
                        id: true,
                        name: true,
                        logo_url: true,
                        category_id: true,
                    },
                },
            },
        });

        return rows.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;

            const gdA = a.goals_for - a.goals_against;
            const gdB = b.goals_for - b.goals_against;
            if (gdB !== gdA) return gdB - gdA;

            if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for;
            if (b.wins !== a.wins) return b.wins - a.wins;
            return a.teams.name.localeCompare(b.teams.name);
        });
    }
}
