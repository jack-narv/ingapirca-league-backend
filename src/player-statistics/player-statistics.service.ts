import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PlayerStatisticsService {
    constructor(private prisma: PrismaService) {}

    async findBySeason(seasonId: string, categoryId?: string) {
        return this.prisma.player_statistics.findMany({
            where: {
                season_id: seasonId,
                ...(categoryId
                    ? {
                          players: {
                              team_player: {
                                  some: {
                                      teams: {
                                          season_id: seasonId,
                                          category_id: categoryId,
                                      },
                                  },
                              },
                          },
                      }
                    : {}),
            },
            include: {
                players: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        photo_url: true,
                    },
                },
            },
            orderBy: [
                { goals: 'desc' },
                { assists: 'desc' },
                { yellow_cards: 'asc' },
                { red_cards: 'asc' },
            ],
        });
    }

    async findByPlayer(playerId: string, seasonId?: string) {
        if (seasonId) {
            const stats = await this.prisma.player_statistics.findUnique({
                where: {
                    player_id_season_id: {
                        player_id: playerId,
                        season_id: seasonId,
                    },
                },
                include: {
                    players: {
                        select: {
                            id: true,
                            first_name: true,
                            last_name: true,
                            photo_url: true,
                        },
                    },
                    seasons: {
                        select: {
                            id: true,
                            name: true,
                            status: true,
                        },
                    },
                },
            });

            if (!stats) {
                throw new NotFoundException(
                    'No se encontraron estadisticas para ese jugador en la temporada',
                );
            }

            return stats;
        }

        return this.prisma.player_statistics.findMany({
            where: { player_id: playerId },
            include: {
                seasons: {
                    select: {
                        id: true,
                        name: true,
                        status: true,
                    },
                },
            },
            orderBy: [{ season_id: 'desc' }],
        });
    }

    async topScorers(seasonId: string, limit = 10, categoryId?: string) {
        const safeLimit = this.normalizeLimit(limit);

        return this.prisma.player_statistics.findMany({
            where: {
                season_id: seasonId,
                ...(categoryId
                    ? {
                          players: {
                              team_player: {
                                  some: {
                                      teams: {
                                          season_id: seasonId,
                                          category_id: categoryId,
                                      },
                                  },
                              },
                          },
                      }
                    : {}),
            },
            include: {
                players: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        photo_url: true,
                    },
                },
            },
            orderBy: [{ goals: 'desc' }, { assists: 'desc' }],
            take: safeLimit,
        });
    }

    async topCards(seasonId: string, limit = 10, categoryId?: string) {
        const safeLimit = this.normalizeLimit(limit);

        return this.prisma.player_statistics.findMany({
            where: {
                season_id: seasonId,
                ...(categoryId
                    ? {
                          players: {
                              team_player: {
                                  some: {
                                      teams: {
                                          season_id: seasonId,
                                          category_id: categoryId,
                                      },
                                  },
                              },
                          },
                      }
                    : {}),
            },
            include: {
                players: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        photo_url: true,
                    },
                },
            },
            orderBy: [{ red_cards: 'desc' }, { yellow_cards: 'desc' }],
            take: safeLimit,
        });
    }

    private normalizeLimit(limit: number) {
        if (!Number.isInteger(limit) || limit <= 0 || limit > 100) {
            throw new BadRequestException(
                'El limite debe ser un entero entre 1 y 100',
            );
        }

        return limit;
    }
}
