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

        return this.sortRows(rows);
    }

    async recalculateSeasonStandings(seasonId: string, categoryId?: string) {
        const rows = await this.prisma.$transaction(async (tx) => {
            const teams = await tx.teams.findMany({
                where: {
                    season_id: seasonId,
                    ...(categoryId ? { category_id: categoryId } : {}),
                },
                select: { id: true },
            });

            const teamIds = teams.map((team) => team.id);

            if (teamIds.length === 0) {
                return [];
            }

            const teamStats = new Map(
                teamIds.map((teamId) => [
                    teamId,
                    {
                        played: 0,
                        wins: 0,
                        draws: 0,
                        losses: 0,
                        goals_for: 0,
                        goals_against: 0,
                        points: 0,
                    },
                ]),
            );

            const playedMatches = await tx.matches.findMany({
                where: {
                    season_id: seasonId,
                    status: 'PLAYED',
                    ...(categoryId ? { category_id: categoryId } : {}),
                },
                select: {
                    home_team_id: true,
                    away_team_id: true,
                    home_score: true,
                    away_score: true,
                    journal: true,
                },
            });

            for (const match of playedMatches) {
                if (this.isKnockoutJournal(match.journal)) {
                    continue;
                }

                const home = teamStats.get(match.home_team_id);
                const away = teamStats.get(match.away_team_id);
                if (!home || !away) {
                    continue;
                }

                home.played += 1;
                away.played += 1;
                home.goals_for += match.home_score;
                home.goals_against += match.away_score;
                away.goals_for += match.away_score;
                away.goals_against += match.home_score;

                if (match.home_score > match.away_score) {
                    home.wins += 1;
                    home.points += 3;
                    away.losses += 1;
                } else if (match.home_score < match.away_score) {
                    away.wins += 1;
                    away.points += 3;
                    home.losses += 1;
                } else {
                    home.draws += 1;
                    away.draws += 1;
                    home.points += 1;
                    away.points += 1;
                }
            }

            await tx.standings.deleteMany({
                where: {
                    season_id: seasonId,
                    team_id: { in: teamIds },
                },
            });

            await tx.standings.createMany({
                data: teamIds.map((teamId) => {
                    const stats = teamStats.get(teamId)!;
                    return {
                        season_id: seasonId,
                        team_id: teamId,
                        played: stats.played,
                        wins: stats.wins,
                        draws: stats.draws,
                        losses: stats.losses,
                        goals_for: stats.goals_for,
                        goals_against: stats.goals_against,
                        points: stats.points,
                    };
                }),
            });

            return tx.standings.findMany({
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
        });

        return this.sortRows(rows);
    }

    private sortRows(rows: any[]) {
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

    private isKnockoutJournal(journal?: string | null) {
        if (!journal) {
            return false;
        }

        if (/^\d+$/.test(journal)) {
            return false;
        }

        if (/^JOURNAL\s+\d+$/i.test(journal.trim())) {
            return false;
        }

        return true;
    }
}
