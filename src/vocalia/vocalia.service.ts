import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class VocaliaService {
    constructor(private prisma: PrismaService) {}

    private async getOrCreateVocalia(matchId: string, teamId: string) {
        const existing = await this.prisma.vocalia.findUnique({
            where: {
                match_id_team_id: {
                    match_id: matchId,
                    team_id: teamId,
                },
            },
            select: { id: true },
        });

        if (existing) {
            return existing;
        }

        try {
            return await this.prisma.vocalia.create({
                data: {
                    match_id: matchId,
                    team_id: teamId,
                },
                select: { id: true },
            });
        } catch (error) {
            const isUniqueConflict =
                typeof error === 'object' &&
                error !== null &&
                'code' in error &&
                (error as { code?: string }).code === 'P2002';

            if (!isUniqueConflict) {
                throw error;
            }

            const row = await this.prisma.vocalia.findUnique({
                where: {
                    match_id_team_id: {
                        match_id: matchId,
                        team_id: teamId,
                    },
                },
                select: { id: true },
            });

            if (!row) {
                throw error;
            }

            return row;
        }
    }

    private async ensureMatchAndTeam(matchId: string, teamId: string) {
        const match = await this.prisma.matches.findUnique({
            where: { id: matchId },
            select: { id: true, home_team_id: true, away_team_id: true },
        });

        if (!match) {
            throw new BadRequestException('Partido no encontrado.');
        }

        const teamIsInMatch =
            match.home_team_id === teamId || match.away_team_id === teamId;

        if (!teamIsInMatch) {
            throw new BadRequestException(
                'El equipo no pertenece a este partido.',
            );
        }
    }

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

    async addValueToMatchTeam(
        matchId: string,
        teamId: string,
        data: {
            concept: string;
            amount: number;
        },
    ) {
        await this.ensureMatchAndTeam(matchId, teamId);

        const concept = data.concept?.trim();
        if (!concept) {
            throw new BadRequestException('El concepto es obligatorio.');
        }

        if (!Number.isFinite(data.amount)) {
            throw new BadRequestException('El monto es invalido.');
        }

        const vocalia = await this.getOrCreateVocalia(matchId, teamId);

        return this.prisma.vocalia_values.create({
            data: {
                vocalia_id: vocalia.id,
                concept,
                amount: data.amount,
            },
            select: {
                id: true,
                vocalia_id: true,
                concept: true,
                amount: true,
            },
        });
    }

    async updateValueInMatchTeam(
        matchId: string,
        teamId: string,
        valueId: string,
        data: {
            concept?: string;
            amount?: number;
        },
    ) {
        await this.ensureMatchAndTeam(matchId, teamId);

        const value = await this.prisma.vocalia_values.findUnique({
            where: { id: valueId },
            include: {
                vocalia: {
                    select: {
                        id: true,
                        match_id: true,
                        team_id: true,
                    },
                },
            },
        });

        if (!value) {
            throw new BadRequestException('Valor de vocalia no encontrado.');
        }

        if (
            value.vocalia.match_id !== matchId ||
            value.vocalia.team_id !== teamId
        ) {
            throw new BadRequestException(
                'El valor no pertenece al partido/equipo indicado.',
            );
        }

        const updateData: { concept?: string; amount?: number } = {};

        if (data.concept !== undefined) {
            const concept = data.concept.trim();
            if (!concept) {
                throw new BadRequestException('El concepto es obligatorio.');
            }
            updateData.concept = concept;
        }

        if (data.amount !== undefined) {
            if (!Number.isFinite(data.amount)) {
                throw new BadRequestException('El monto es invalido.');
            }
            updateData.amount = data.amount;
        }

        if (!Object.keys(updateData).length) {
            throw new BadRequestException(
                'Debe enviar al menos un campo para actualizar.',
            );
        }

        return this.prisma.vocalia_values.update({
            where: { id: valueId },
            data: updateData,
            select: {
                id: true,
                vocalia_id: true,
                concept: true,
                amount: true,
            },
        });
    }

    async deleteValueInMatchTeam(
        matchId: string,
        teamId: string,
        valueId: string,
    ) {
        await this.ensureMatchAndTeam(matchId, teamId);

        const value = await this.prisma.vocalia_values.findUnique({
            where: { id: valueId },
            include: {
                vocalia: {
                    select: {
                        id: true,
                        match_id: true,
                        team_id: true,
                    },
                },
            },
        });

        if (!value) {
            throw new BadRequestException('Valor de vocalia no encontrado.');
        }

        if (
            value.vocalia.match_id !== matchId ||
            value.vocalia.team_id !== teamId
        ) {
            throw new BadRequestException(
                'El valor no pertenece al partido/equipo indicado.',
            );
        }

        await this.prisma.$transaction(async (tx) => {
            await tx.vocalia_values.delete({
                where: { id: valueId },
            });

            const remaining = await tx.vocalia_values.count({
                where: { vocalia_id: value.vocalia.id },
            });

            if (remaining === 0) {
                await tx.vocalia.delete({
                    where: { id: value.vocalia.id },
                });
            }
        });

        return { id: valueId, deleted: true };
    }
}
