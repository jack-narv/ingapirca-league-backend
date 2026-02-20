import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class MatchObservationsService {
    constructor(private prisma: PrismaService) {}

    // PUBLIC - List observations (optionally filtered)
    getAll(filters?: {
        match_id?: string;
        team_id?: string;
        status?: 'DRAFT' | 'SUBMITTED' | 'REVIEWED';
    }) {
        return this.prisma.match_team_observations.findMany({
            where: {
                match_id: filters?.match_id,
                team_id: filters?.team_id,
                status: filters?.status,
            },
            include: {
                teams: {
                    select: {
                        name: true,
                    },
                },
                players: {
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

    // PUBLIC - List all observations for one match
    getByMatch(matchId: string) {
        return this.getAll({ match_id: matchId });
    }

    // ADMIN - Create or replace team observation for one match
    async submitObservation(
        data: {
            match_id: string;
            team_id: string;
            submitted_by: string;
            observation: string;
            status?: 'DRAFT' | 'SUBMITTED' | 'REVIEWED';
        },
    ) {
        const match = await this.prisma.matches.findUnique({
            where: { id: data.match_id },
            select: {
                id: true,
                home_team_id: true,
                away_team_id: true,
            },
        });

        if (!match) {
            throw new BadRequestException('Partido no encontrado.');
        }

        const teamIsInMatch =
            match.home_team_id === data.team_id ||
            match.away_team_id === data.team_id;

        if (!teamIsInMatch) {
            throw new BadRequestException(
                'El equipo no pertenece a este partido.',
            );
        }

        const playerInTeam = await this.prisma.team_player.findFirst({
            where: {
                team_id: data.team_id,
                player_id: data.submitted_by,
                left_at: null,
            },
            select: { id: true },
        });

        if (!playerInTeam) {
            throw new BadRequestException(
                'El jugador no pertenece al equipo seleccionado.',
            );
        }

        return this.prisma.match_team_observations.upsert({
            where: {
                match_id_team_id: {
                    match_id: data.match_id,
                    team_id: data.team_id,
                },
            },
            update: {
                submitted_by: data.submitted_by,
                observation: data.observation,
                status: data.status ?? 'SUBMITTED',
                submitted_at: new Date(),
            },
            create: {
                match_id: data.match_id,
                team_id: data.team_id,
                submitted_by: data.submitted_by,
                observation: data.observation,
                status: data.status ?? 'SUBMITTED',
                submitted_at: new Date(),
            },
        });
    }
}
