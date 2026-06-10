import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SanctionsService {
    constructor(private prisma: PrismaService){}

    async getCardsSummaryBySeason(
        seasonId: string,
        categoryId?: string,
        teamId?: string,
    ){
        const cardEvents = await this.prisma.match_events.findMany({
            where: {
                event_type: {
                    in: ['YELLOW', 'RED_DIRECT'],
                },
                ...(teamId ? { team_id: teamId } : {}),
                matches: {
                    season_id: seasonId,
                    ...(categoryId ? { category_id: categoryId } : {}),
                },
            },
            select: {
                match_id: true,
                player_id: true,
                team_id: true,
                event_type: true,
                players_match_events_player_idToplayers: {
                    select: {
                        first_name: true,
                        last_name: true,
                    },
                },
                teams: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        if(cardEvents.length === 0){
            return [];
        }

        const playerIds = Array.from(
            new Set(
                cardEvents
                    .map((e) => e.player_id)
                    .filter((id): id is string => Boolean(id)),
            ),
        );
        const matchIds = Array.from(
            new Set(
                cardEvents
                    .map((e) => e.match_id)
                    .filter((id): id is string => Boolean(id)),
            ),
        );

        const [lineups, teamPlayers] = await Promise.all([
            this.prisma.match_lineup.findMany({
                where: {
                    match_id: { in: matchIds },
                    player_id: { in: playerIds },
                },
                select: {
                    match_id: true,
                    player_id: true,
                    team_id: true,
                    shirt_number: true,
                },
            }),
            this.prisma.team_player.findMany({
                where: {
                    player_id: { in: playerIds },
                    teams: {
                        is: {
                            season_id: seasonId,
                        },
                    },
                },
                orderBy: {
                    joined_at: 'desc',
                },
                select: {
                    player_id: true,
                    team_id: true,
                    shirt_number: true,
                    teams: {
                        select: {
                            name: true,
                        },
                    },
                },
            }),
        ]);

        const lineupShirtByMatchPlayer = new Map<string, number>();
        for (const item of lineups) {
            lineupShirtByMatchPlayer.set(
                `${item.match_id}_${item.player_id}_${item.team_id}`,
                item.shirt_number,
            );
        }

        const fallbackShirtByPlayerTeam = new Map<string, number>();
        const fallbackTeamNameByPlayerTeam = new Map<string, string>();
        for (const item of teamPlayers) {
            const key = `${item.player_id}_${item.team_id}`;
            if(fallbackShirtByPlayerTeam.has(key)){
                continue;
            }
            fallbackShirtByPlayerTeam.set(key, item.shirt_number);
            fallbackTeamNameByPlayerTeam.set(
                key,
                item.teams?.name ?? '',
            );
        }

        const summaryByPlayerTeam = new Map<string, {
            player_id: string;
            team_id: string;
            team_name: string;
            first_name: string;
            last_name: string;
            shirt_number: number | null;
            yellow_cards: number;
            red_direct_cards: number;
        }>();

        for (const event of cardEvents) {
            const key = `${event.player_id}_${event.team_id}`;
            const lineupShirt = lineupShirtByMatchPlayer.get(
                `${event.match_id}_${event.player_id}_${event.team_id}`,
            );
            const fallbackShirt = fallbackShirtByPlayerTeam.get(key);
            const existing = summaryByPlayerTeam.get(key);
            const teamName =
                event.teams?.name ??
                fallbackTeamNameByPlayerTeam.get(key) ??
                '';

            if(existing){
                if(event.event_type === 'YELLOW'){
                    existing.yellow_cards += 1;
                }
                if(event.event_type === 'RED_DIRECT'){
                    existing.red_direct_cards += 1;
                }
                existing.shirt_number =
                    existing.shirt_number ??
                    lineupShirt ??
                    fallbackShirt ??
                    null;
                if(!existing.team_name && teamName){
                    existing.team_name = teamName;
                }
                continue;
            }

            summaryByPlayerTeam.set(key, {
                player_id: event.player_id,
                team_id: event.team_id,
                team_name: teamName,
                first_name:
                    event.players_match_events_player_idToplayers?.first_name ??
                    '',
                last_name:
                    event.players_match_events_player_idToplayers?.last_name ??
                    '',
                shirt_number: lineupShirt ?? fallbackShirt ?? null,
                yellow_cards: event.event_type === 'YELLOW' ? 1 : 0,
                red_direct_cards: event.event_type === 'RED_DIRECT' ? 1 : 0,
            });
        }

        return Array.from(summaryByPlayerTeam.values()).sort((a, b) => {
            const totalA = a.yellow_cards + a.red_direct_cards;
            const totalB = b.yellow_cards + b.red_direct_cards;
            if(totalB !== totalA){
                return totalB - totalA;
            }

            const nameA = `${a.first_name} ${a.last_name}`.trim();
            const nameB = `${b.first_name} ${b.last_name}`.trim();
            return nameA.localeCompare(nameB);
        });
    }

    async getSuspensionsSummaryBySeason(
        seasonId: string,
        categoryId?: string,
        teamId?: string,
    ){
        const sanctions = await this.prisma.sanctions.findMany({
            where: {
                season_id: seasonId,
                type: 'SUSPENSION',
                player_id: { not: null },
                ...(teamId ? { team_id: teamId } : {}),
                ...(categoryId
                    ? {
                        matches: {
                            is: {
                                category_id: categoryId,
                            },
                        },
                    }
                    : {}),
            },
            select: {
                player_id: true,
                team_id: true,
                match_id: true,
                matches_affected: true,
                start_date: true,
                players: {
                    select: {
                        first_name: true,
                        last_name: true,
                    },
                },
                teams: {
                    select: {
                        name: true,
                    },
                },
                matches: {
                    select: {
                        category_id: true,
                        match_date: true,
                    },
                },
            },
        });

        if(sanctions.length === 0){
            return [];
        }

        const playerIds = Array.from(
            new Set(
                sanctions
                    .map((s) => s.player_id)
                    .filter((id): id is string => Boolean(id)),
            ),
        );

        const matchIds = Array.from(
            new Set(
                sanctions
                    .map((s) => s.match_id)
                    .filter((id): id is string => Boolean(id)),
            ),
        );

        const [lineups, teamPlayers, playedMatches] = await Promise.all([
            matchIds.length > 0
                ? this.prisma.match_lineup.findMany({
                    where: {
                        match_id: { in: matchIds },
                        player_id: { in: playerIds },
                    },
                    select: {
                        match_id: true,
                        player_id: true,
                        team_id: true,
                        shirt_number: true,
                    },
                })
                : Promise.resolve([]),
            this.prisma.team_player.findMany({
                where: {
                    player_id: { in: playerIds },
                    teams: {
                        is: {
                            season_id: seasonId,
                        },
                    },
                },
                orderBy: {
                    joined_at: 'desc',
                },
                select: {
                    player_id: true,
                    team_id: true,
                    shirt_number: true,
                    teams: {
                        select: {
                            name: true,
                        },
                    },
                },
            }),
            this.prisma.matches.findMany({
                where: {
                    season_id: seasonId,
                    status: 'PLAYED',
                },
                select: {
                    match_date: true,
                    home_team_id: true,
                    away_team_id: true,
                },
            }),
        ]);

        const lineupShirtByMatchPlayer = new Map<string, number>();
        for (const item of lineups) {
            lineupShirtByMatchPlayer.set(
                `${item.match_id}_${item.player_id}_${item.team_id}`,
                item.shirt_number,
            );
        }

        const fallbackShirtByPlayerTeam = new Map<string, number>();
        const fallbackTeamNameByPlayerTeam = new Map<string, string>();
        for (const item of teamPlayers) {
            const key = `${item.player_id}_${item.team_id}`;
            if(fallbackShirtByPlayerTeam.has(key)){
                continue;
            }

            fallbackShirtByPlayerTeam.set(key, item.shirt_number);
            fallbackTeamNameByPlayerTeam.set(
                key,
                item.teams?.name ?? '',
            );
        }

        const summaryByPlayerTeam = new Map<string, {
            player_id: string;
            team_id: string;
            team_name: string;
            first_name: string;
            last_name: string;
            shirt_number: number | null;
            pending_matches_suspended: number;
        }>();

        for (const sanction of sanctions) {
            if(!sanction.player_id){
                continue;
            }

            const matchesAffected = sanction.matches_affected ?? 1;
            const referenceDate =
                sanction.matches?.match_date ??
                sanction.start_date ??
                new Date(0);
            const sanctionTeamId = sanction.team_id;
            const servedMatches = sanctionTeamId
                ? playedMatches.filter(
                    (match) =>
                        match.match_date > referenceDate &&
                        (
                            match.home_team_id === sanctionTeamId ||
                            match.away_team_id === sanctionTeamId
                        ),
                  ).length
                : 0;
            const pendingMatches = matchesAffected - servedMatches;
            if(pendingMatches <= 0){
                continue;
            }

            const summaryTeamId = sanction.team_id ?? 'unknown';
            const summaryKey = `${sanction.player_id}_${summaryTeamId}`;
            const lineupShirt =
                sanction.match_id
                    ? lineupShirtByMatchPlayer.get(
                        `${sanction.match_id}_${sanction.player_id}_${summaryTeamId}`,
                    )
                    : undefined;
            const fallbackShirt = fallbackShirtByPlayerTeam.get(summaryKey);
            const teamName =
                sanction.teams?.name ??
                fallbackTeamNameByPlayerTeam.get(summaryKey) ??
                '';

            const existing = summaryByPlayerTeam.get(summaryKey);
            if(existing){
                existing.pending_matches_suspended += pendingMatches;
                existing.shirt_number =
                    existing.shirt_number ??
                    lineupShirt ??
                    fallbackShirt ??
                    null;
                if(!existing.team_name && teamName){
                    existing.team_name = teamName;
                }
                continue;
            }

            summaryByPlayerTeam.set(summaryKey, {
                player_id: sanction.player_id,
                team_id: summaryTeamId,
                team_name: teamName,
                first_name: sanction.players?.first_name ?? '',
                last_name: sanction.players?.last_name ?? '',
                shirt_number: lineupShirt ?? fallbackShirt ?? null,
                pending_matches_suspended: pendingMatches,
            });
        }

        return Array.from(summaryByPlayerTeam.values()).sort((a, b) => {
            if (b.pending_matches_suspended !== a.pending_matches_suspended) {
                return b.pending_matches_suspended - a.pending_matches_suspended;
            }

            const nameA = `${a.first_name} ${a.last_name}`.trim();
            const nameB = `${b.first_name} ${b.last_name}`.trim();
            return nameA.localeCompare(nameB);
        });
    }

    async getSeasonOverview(
        seasonId: string,
        categoryId?: string,
        teamId?: string,
    ){
        const [categories, teams, cardsSummary, suspensionsSummary] = await Promise.all([
            this.prisma.season_categories.findMany({
                where: {
                    season_id: seasonId,
                    is_active: true,
                },
                select: {
                    id: true,
                    season_id: true,
                    name: true,
                    sort_order: true,
                    is_active: true,
                },
                orderBy: [
                    { sort_order: 'asc' },
                    { name: 'asc' },
                ],
            }),
            this.prisma.teams.findMany({
                where: {
                    season_id: seasonId,
                },
                select: {
                    id: true,
                    category_id: true,
                    name: true,
                    founded_year: true,
                    logo_url: true,
                },
                orderBy: {
                    name: 'asc',
                },
            }),
            this.getCardsSummaryBySeason(seasonId, categoryId, teamId),
            this.getSuspensionsSummaryBySeason(seasonId, categoryId, teamId),
        ]);

        return {
            categories,
            teams,
            cards_summary: cardsSummary,
            suspensions_summary: suspensionsSummary,
        };
    }
    async getSuspendedPlayersForMatch(matchId: string, teamId: string){
        const match = await this.prisma.matches.findUnique({
            where: { id: matchId },
            select: {
                id: true,
                season_id: true,
                match_date: true,
                home_team_id: true,
                away_team_id: true,
            },
        });

        if(!match){
            throw new BadRequestException('Partido no encontrado.');
        }

        const teamInMatch =
            match.home_team_id === teamId || match.away_team_id === teamId;

        if(!teamInMatch){
            throw new BadRequestException(
                'El equipo no pertenece al partido indicado.',
            );
        }

        const [playedMatches, suspensions] = await Promise.all([
            this.prisma.matches.findMany({
                where: {
                    season_id: match.season_id,
                    status: 'PLAYED',
                    match_date: { lt: match.match_date },
                    OR: [
                        { home_team_id: teamId },
                        { away_team_id: teamId },
                    ],
                },
                select: {
                    id: true,
                    match_date: true,
                },
            }),
            this.prisma.sanctions.findMany({
                where: {
                    season_id: match.season_id,
                    type: 'SUSPENSION',
                    player_id: { not: null },
                    OR: [
                        { team_id: teamId },
                        { team_id: null },
                    ],
                },
                include: {
                    players: {
                        select: {
                            id: true,
                            first_name: true,
                            last_name: true,
                        },
                    },
                    matches: {
                        select: {
                            id: true,
                            match_date: true,
                        },
                    },
                },
                orderBy: { start_date: 'desc' },
            }),
        ]);

        const suspendedByPlayer = new Map<string, {
            player_id: string;
            first_name: string;
            last_name: string;
            pending_matches: number;
            reasons: string[];
        }>();

        for (const suspension of suspensions) {
            if(!suspension.player_id || !suspension.players){
                continue;
            }

            const affectedMatches = suspension.matches_affected ?? 1;
            const referenceDate =
                suspension.matches?.match_date ??
                suspension.start_date ??
                new Date(0);

            const servedMatches = playedMatches.filter(
                (playedMatch) => playedMatch.match_date > referenceDate,
            ).length;

            const pendingMatches = affectedMatches - servedMatches;
            if(pendingMatches <= 0){
                continue;
            }

            const existing = suspendedByPlayer.get(suspension.player_id);
            if(existing){
                existing.pending_matches = Math.max(
                    existing.pending_matches,
                    pendingMatches,
                );
                existing.reasons.push(suspension.reason);
                continue;
            }

            suspendedByPlayer.set(suspension.player_id, {
                player_id: suspension.player_id,
                first_name: suspension.players.first_name,
                last_name: suspension.players.last_name,
                pending_matches: pendingMatches,
                reasons: [suspension.reason],
            });
        }

        return Array.from(suspendedByPlayer.values());
    }

    async handleCardEvent(data : {
        match_id: string;
        player_id: string;
        team_id: string;
        season_id: string;
        event_type: 'YELLOW' | 'DOBLE_YELLOW_RED' | 'RED_DIRECT';
    }, tx?: Prisma.TransactionClient){
        const seasonRules = await this.getSeasonCardRules(data.season_id, tx);

        if(data.event_type === 'YELLOW'){
            await this.handleYellow(
                data,
                seasonRules.two_yellows_matches_affected,
                tx,
            );
        }

        if(data.event_type === 'DOBLE_YELLOW_RED'){
            await this.handleDoubleYellow(
                data,
                seasonRules.two_yellows_matches_affected,
                tx,
            );
        }

        if(data.event_type === 'RED_DIRECT'){
            await this.handleRedDirect(
                data,
                seasonRules.direct_red_matches_affected,
                tx,
            );
        }
    }

    //YELLOW CARD LOGIC
    private async handleYellow(
        data: any,
        matchesAffected: number,
        tx?: Prisma.TransactionClient,
    ){
        if(matchesAffected <= 0){
            return;
        }

        const prisma = tx ?? this.prisma;

        //Count yellows in a season
        const yellowsInSeason = await prisma.match_events.count({
            where: {
                player_id: data.player_id,
                event_type: 'YELLOW',
                matches: {
                    season_id: data.season_id,
                },
            },
        });

        if(yellowsInSeason % 5 === 0){
            await this.createSuspension({
                ...data,
                reason: 'Acumulación de tarjetas amarillas',
                matches: matchesAffected,
            });
        }
    }


    //DOUBLE YELLOW LOGIC
    private async handleDoubleYellow(
        data: any,
        matchesAffected: number,
        tx?: Prisma.TransactionClient,
    ){
        if(matchesAffected <= 0){
            return;
        }

        await this.createSuspension({
            ...data,
            reason: 'Doble amarilla',
            matches: matchesAffected,
        }, tx);
    }


    //DIRECT RED LOGIC
    private async handleRedDirect(
        data: any,
        matchesAffected: number,
        tx?: Prisma.TransactionClient,
    ){
        if(matchesAffected <= 0){
            return;
        }

        await this.createSuspension({
            ...data,
            reason: 'Roja directa',
            matches: matchesAffected,
        }, tx);
    }

    private async getSeasonCardRules(
        seasonId: string,
        tx?: Prisma.TransactionClient,
    ){
        const prisma = tx ?? this.prisma;
        const season = await prisma.seasons.findUnique({
            where: {
                id: seasonId,
            },
            select: {
                two_yellows_matches_affected: true,
                direct_red_matches_affected: true,
            },
        });

        if(!season){
            throw new BadRequestException('Temporada no encontrada.');
        }

        return {
            two_yellows_matches_affected: Math.max(
                0,
                season.two_yellows_matches_affected ?? 0,
            ),
            direct_red_matches_affected: Math.max(
                0,
                season.direct_red_matches_affected ?? 0,
            ),
        };
    }

    //CREATE SANCTION
    private async createSuspension(data: {
        season_id: string;
        team_id: string,
        player_id: string;
        match_id: string;
        reason:string;
        matches: number;
    }, tx?: Prisma.TransactionClient){
        const prisma = tx ?? this.prisma;
        //Prevent duplicates
        const exists = await prisma.sanctions.findFirst({
            where: {
                player_id: data.player_id,
                match_id: data.match_id,
                type: 'SUSPENSION',
            },
            select: {
                id: true,
                matches_affected: true,
            },
        });

        if(exists){
            const currentMatches = exists.matches_affected ?? 0;

            if(data.matches > currentMatches){
                await prisma.sanctions.update({
                    where: { id: exists.id },
                    data: {
                        reason: data.reason,
                        matches_affected: data.matches,
                    },
                });
            }

            return;
        }

        await prisma.sanctions.create({
            data: {
                season_id: data.season_id,
                team_id: data.team_id,
                player_id: data.player_id,
                match_id: data.match_id,
                type: 'SUSPENSION',
                reason: data.reason,
                matches_affected: data.matches,
                start_date: new Date(),
            },
        });
    }
}

