import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

type ScorerSummaryPlayer = {
    player_id: string;
    player_name: string;
    team_id: string;
    team_name: string;
    goals: number;
};

type ScorerSummaryTeam = {
    team_id: string;
    team_name: string;
    total_goals: number;
    players: ScorerSummaryPlayer[];
};

type ScorerSummaryCategory = {
    category_id: string;
    category_name: string;
    teams: ScorerSummaryTeam[];
    top_players: ScorerSummaryPlayer[];
};

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
        const categories = await this.buildScorerCategories(seasonId, categoryId);
        const topPlayers = categories
            .flatMap((category) => category.top_players)
            .sort((a, b) => {
                const byGoals = b.goals - a.goals;
                if (byGoals !== 0) {
                    return byGoals;
                }

                return a.player_name.localeCompare(b.player_name);
            })
            .slice(0, safeLimit);

        return topPlayers.map((player) => ({
            player_id: player.player_id,
            season_id: seasonId,
            goals: player.goals,
            assists: 0,
            yellow_cards: 0,
            red_cards: 0,
            players: {
                id: player.player_id,
                first_name: this.extractFirstName(player.player_name),
                last_name: this.extractLastName(player.player_name),
                photo_url: null,
            },
            team_id: player.team_id,
            team_name: player.team_name,
        }));
    }

    async scorersSummary(seasonId: string, categoryId?: string) {
        return this.buildScorerCategories(seasonId, categoryId);
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

    private async buildScorerCategories(seasonId: string, categoryId?: string) {
        const events = await this.prisma.match_events.findMany({
            where: {
                event_type: 'GOAL',
                matches: {
                    season_id: seasonId,
                    ...(categoryId ? { category_id: categoryId } : {}),
                },
            },
            select: {
                player_id: true,
                team_id: true,
                matches: {
                    select: {
                        category_id: true,
                    },
                },
                teams: {
                    select: {
                        id: true,
                        name: true,
                        category_id: true,
                        season_categories: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
                players_match_events_player_idToplayers: {
                    select: {
                        first_name: true,
                        last_name: true,
                    },
                },
            },
        });

        const byCategoryTeamPlayer = new Map<
            string,
            Map<string, Map<string, ScorerSummaryPlayer>>
        >();
        const categoryNames = new Map<string, string>();
        const teamNames = new Map<string, string>();

        for (const event of events) {
            const resolvedCategoryId =
                event.matches.category_id ?? event.teams.category_id ?? 'none';
            if (categoryId && resolvedCategoryId !== categoryId) {
                continue;
            }

            const resolvedCategoryName =
                event.teams.season_categories?.name ?? 'Sin categoria';
            const resolvedTeamId = event.team_id;
            const resolvedTeamName = event.teams.name;
            const playerName = this.normalizePersonName(
                event.players_match_events_player_idToplayers.first_name,
                event.players_match_events_player_idToplayers.last_name,
                event.player_id,
            );

            categoryNames.set(resolvedCategoryId, resolvedCategoryName);
            teamNames.set(resolvedTeamId, resolvedTeamName);

            const playersByTeam = this.getOrCreateNestedMap(
                byCategoryTeamPlayer,
                resolvedCategoryId,
                resolvedTeamId,
            );

            const current = playersByTeam.get(event.player_id);
            if (current) {
                current.goals += 1;
                continue;
            }

            playersByTeam.set(event.player_id, {
                player_id: event.player_id,
                player_name: playerName,
                team_id: resolvedTeamId,
                team_name: resolvedTeamName,
                goals: 1,
            });
        }

        return Array.from(byCategoryTeamPlayer.entries())
            .map(([currentCategoryId, teams]) => {
                const mappedTeams = Array.from(teams.entries())
                    .map(([currentTeamId, players]) => {
                        const mappedPlayers = Array.from(players.values()).sort(
                            (a, b) => {
                                const byGoals = b.goals - a.goals;
                                if (byGoals !== 0) {
                                    return byGoals;
                                }

                                return a.player_name.localeCompare(
                                    b.player_name,
                                );
                            },
                        );

                        return {
                            team_id: currentTeamId,
                            team_name:
                                teamNames.get(currentTeamId) ?? currentTeamId,
                            total_goals: mappedPlayers.reduce(
                                (sum, player) => sum + player.goals,
                                0,
                            ),
                            players: mappedPlayers,
                        };
                    })
                    .sort((a, b) => a.team_name.localeCompare(b.team_name));

                const topPlayers = mappedTeams
                    .flatMap((team) => team.players)
                    .sort((a, b) => {
                        const byGoals = b.goals - a.goals;
                        if (byGoals !== 0) {
                            return byGoals;
                        }

                        return a.player_name.localeCompare(b.player_name);
                    });

                return {
                    category_id: currentCategoryId,
                    category_name:
                        categoryNames.get(currentCategoryId) ?? 'Sin categoria',
                    teams: mappedTeams,
                    top_players: topPlayers,
                };
            })
            .sort((a, b) => a.category_name.localeCompare(b.category_name));
    }

    private getOrCreateNestedMap(
        source: Map<string, Map<string, Map<string, ScorerSummaryPlayer>>>,
        categoryId: string,
        teamId: string,
    ) {
        let teams = source.get(categoryId);
        if (!teams) {
            teams = new Map<string, Map<string, ScorerSummaryPlayer>>();
            source.set(categoryId, teams);
        }

        let players = teams.get(teamId);
        if (!players) {
            players = new Map<string, ScorerSummaryPlayer>();
            teams.set(teamId, players);
        }

        return players;
    }

    private normalizePersonName(
        firstName: string,
        lastName: string,
        fallbackId: string,
    ) {
        const fullName = `${firstName} ${lastName}`.trim();
        return fullName || fallbackId;
    }

    private extractFirstName(fullName: string) {
        const [firstName = ''] = fullName.trim().split(/\s+/);
        return firstName;
    }

    private extractLastName(fullName: string) {
        const parts = fullName.trim().split(/\s+/);
        return parts.length > 1 ? parts.slice(1).join(' ') : '';
    }
}
