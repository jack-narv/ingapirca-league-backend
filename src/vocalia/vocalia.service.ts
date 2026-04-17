import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class VocaliaService {
    constructor(private prisma: PrismaService) {}

    async getByMatch(matchId: string) {
        const match = await this.prisma.matches.findUnique({
            where: { id: matchId },
            select: { id: true, match_date: true, home_team_id: true, away_team_id: true },
        });

        if (!match) {
            throw new BadRequestException('Partido no encontrado.');
        }

        const vocaliaRows = await this.prisma.vocalia.findMany({
            where: { match_id: matchId },
            include: {
                teams: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                vocalia_values: {
                    select: {
                        id: true,
                        concept: true,
                        amount: true,
                    },
                    orderBy: {
                        concept: 'asc',
                    },
                },
            },
            orderBy: {
                id: 'asc',
            },
        });

        const vocaliaIds = vocaliaRows.map((row) => row.id);
        const totals =
            vocaliaIds.length > 0
                ? await this.prisma.vocalia_values.groupBy({
                      by: ['vocalia_id'],
                      where: {
                          vocalia_id: {
                              in: vocaliaIds,
                          },
                      },
                      _sum: {
                          amount: true,
                      },
                  })
                : [];

        const totalsByVocaliaId = new Map(
            totals.map((row) => [row.vocalia_id, Number(row._sum.amount ?? 0)]),
        );

        return {
            match: {
                id: match.id,
                match_date: match.match_date,
                home_team_id: match.home_team_id,
                away_team_id: match.away_team_id,
            },
            vocalia: vocaliaRows.map((row) => ({
                id: row.id,
                match_id: row.match_id,
                team_id: row.team_id,
                team_name: row.teams.name,
                values: row.vocalia_values.map((item) => ({
                    id: item.id,
                    concept: item.concept,
                    amount: Number(item.amount),
                })),
                total_amount: totalsByVocaliaId.get(row.id) ?? 0,
            })),
        };
    }

    async getById(vocaliaId: string) {
        const row = await this.prisma.vocalia.findUnique({
            where: { id: vocaliaId },
            include: {
                teams: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                matches: {
                    select: {
                        id: true,
                        match_date: true,
                    },
                },
                vocalia_values: {
                    select: {
                        id: true,
                        concept: true,
                        amount: true,
                    },
                    orderBy: {
                        concept: 'asc',
                    },
                },
            },
        });

        if (!row) {
            throw new BadRequestException('Registro de vocalia no encontrado.');
        }

        const sum = await this.prisma.vocalia_values.aggregate({
            where: { vocalia_id: vocaliaId },
            _sum: { amount: true },
        });

        return {
            id: row.id,
            match_id: row.match_id,
            team_id: row.team_id,
            team_name: row.teams.name,
            match: row.matches,
            values: row.vocalia_values.map((item) => ({
                id: item.id,
                concept: item.concept,
                amount: Number(item.amount),
            })),
            total_amount: Number(sum._sum.amount ?? 0),
        };
    }
}
