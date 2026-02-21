import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class MatchRefereeObservationsService {
    constructor(private prisma: PrismaService) {}

    getAll(filters?: {
        match_id?: string;
        referee_id?: string;
        status?: 'DRAFT' | 'SUBMITTED' | 'REVIEWED';
        season_id?: string;
    }) {
        return this.prisma.match_referee_observations.findMany({
            where: {
                match_id: filters?.match_id,
                referee_id: filters?.referee_id,
                status: filters?.status,
                ...(filters?.season_id
                    ? { matches: { is: { season_id: filters.season_id } } }
                    : {}),
            },
            include: {
                referees: {
                    select: {
                        first_name: true,
                        last_name: true,
                    },
                },
                matches: {
                    select: {
                        match_date: true,
                        status: true,
                    },
                },
            },
            orderBy: {
                submitted_at: 'desc',
            },
        });
    }

    getByMatch(matchId: string) {
        return this.getAll({ match_id: matchId });
    }

    async submitObservation(data: {
        match_id: string;
        referee_id: string;
        observation: string;
        status?: 'DRAFT' | 'SUBMITTED' | 'REVIEWED';
    }) {
        const [match, referee, assignment] = await Promise.all([
            this.prisma.matches.findUnique({
                where: { id: data.match_id },
                select: { id: true, season_id: true },
            }),
            this.prisma.referees.findUnique({
                where: { id: data.referee_id },
                select: { id: true, season_id: true, is_active: true },
            }),
            this.prisma.match_referees.findFirst({
                where: {
                    match_id: data.match_id,
                    referee_id: data.referee_id,
                },
                select: { id: true },
            }),
        ]);

        if (!match) {
            throw new BadRequestException('Partido no encontrado.');
        }

        if (!referee) {
            throw new BadRequestException('Arbitro no encontrado.');
        }

        if (!referee.is_active) {
            throw new BadRequestException('El arbitro esta inactivo.');
        }

        if (referee.season_id !== match.season_id) {
            throw new BadRequestException(
                'El arbitro no pertenece a la temporada de este partido.',
            );
        }

        if (!assignment) {
            throw new BadRequestException(
                'El arbitro no esta asignado a este partido.',
            );
        }

        return this.prisma.match_referee_observations.upsert({
            where: {
                match_id_referee_id: {
                    match_id: data.match_id,
                    referee_id: data.referee_id,
                },
            },
            update: {
                observation: data.observation,
                status: data.status ?? 'SUBMITTED',
                submitted_at: new Date(),
            },
            create: {
                match_id: data.match_id,
                referee_id: data.referee_id,
                observation: data.observation,
                status: data.status ?? 'SUBMITTED',
                submitted_at: new Date(),
            },
        });
    }
}
