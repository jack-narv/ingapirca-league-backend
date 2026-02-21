import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateRefereeRatingDto } from './dto/create-referee-rating.dto';

@Injectable()
export class RefereeRatingsService {
    constructor(private prisma: PrismaService) {}

    async create(data: CreateRefereeRatingDto) {
        if (data.rating < 0 || data.rating > 10) {
            throw new BadRequestException(
                'La calificacion debe estar entre 0 y 10.',
            );
        }

        const match = await this.prisma.matches.findUnique({
            where: { id: data.match_id },
            select: {
                id: true,
                season_id: true,
                home_team_id: true,
                away_team_id: true,
            },
        });

        if (!match) {
            throw new NotFoundException('Partido no encontrado.');
        }

        const teamIsInMatch =
            match.home_team_id === data.team_id ||
            match.away_team_id === data.team_id;

        if (!teamIsInMatch) {
            throw new BadRequestException(
                'El equipo no pertenece a este partido.',
            );
        }

        const assignment = await this.prisma.match_referees.findFirst({
            where: {
                match_id: data.match_id,
                referee_id: data.referee_id,
            },
            select: { id: true },
        });

        if (!assignment) {
            throw new BadRequestException(
                'El arbitro no esta asignado a este partido.',
            );
        }

        const referee = await this.prisma.referees.findUnique({
            where: { id: data.referee_id },
            select: { id: true, season_id: true },
        });

        if (!referee) {
            throw new NotFoundException('Arbitro no encontrado.');
        }

        if (referee.season_id !== match.season_id) {
            throw new BadRequestException(
                'El arbitro no pertenece a la temporada de este partido.',
            );
        }

        return this.prisma.referee_ratings.upsert({
            where: {
                match_id_referee_id_team_id: {
                    match_id: data.match_id,
                    referee_id: data.referee_id,
                    team_id: data.team_id,
                },
            },
            update: {
                rating: data.rating,
                comment: data.comment,
                submitted_at: new Date(),
            },
            create: {
                ...data,
                submitted_at: new Date(),
            },
        });
    }

    getAll(filters?: {
        match_id?: string;
        referee_id?: string;
        team_id?: string;
        season_id?: string;
    }) {
        return this.prisma.referee_ratings.findMany({
            where: {
                match_id: filters?.match_id,
                referee_id: filters?.referee_id,
                team_id: filters?.team_id,
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
                teams: {
                    select: {
                        name: true,
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

    getAverageByReferee(refereeId: string) {
        return this.prisma.referee_ratings.aggregate({
            where: { referee_id: refereeId },
            _avg: { rating: true },
            _count: { rating: true },
        });
    }
}
