import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SanctionsService {
    constructor(private prisma: PrismaService){}

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
    }){
        if(data.event_type === 'YELLOW'){
            await this.handleYellow(data);
        }

        if(data.event_type === 'RED_DIRECT'){
            await this.handleRedDirect(data);
        }
    }

    //YELLOW CARD LOGIC
    private async handleYellow(data:any){
        //Count yellows in this match
        const yellowsInMatch = await this.prisma.match_events.count({
            where: {
                match_id: data.match_id,
                player_id: data.player_id,
                event_type: 'YELLOW',
            },
        });

        //Two yellows = red
        if(yellowsInMatch === 2){
            await this.createSuspension({
                ...data,
                reason: 'Dos amarillas en el mismo partido',
                matches: 1,
            });

            return;
        }


        //Count yellows in a season
        const yellowsInSeason = await this.prisma.match_events.count({
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
                matches: 1,
            });
        }
    }


    //DIRECT RED LOGIC
    private async handleRedDirect(data: any){
        await this.createSuspension({
            ...data,
            reason: 'Roja directa',
            matches: 2,
        });
    }

    //CREATE SANCTION
    private async createSuspension(data: {
        season_id: string;
        team_id: string,
        player_id: string;
        match_id: string;
        reason:string;
        matches: number;
    }){
        //Prevent duplicates
        const exists = await this.prisma.sanctions.findFirst({
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
                await this.prisma.sanctions.update({
                    where: { id: exists.id },
                    data: {
                        reason: data.reason,
                        matches_affected: data.matches,
                    },
                });
            }

            return;
        }

        await this.prisma.sanctions.create({
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
