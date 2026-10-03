import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { EXTRA_STATUSES, PLAYING_STATUSES, isKnockoutJournal } from '../matches/match-period.util';
import { Prisma } from '@prisma/client';
import { LiveGateway } from 'src/live/live.gateway';
import { SanctionsService } from 'src/sanctions/sanctions.service';

@Injectable()
export class MatchEventsService {
    constructor(private prisma: PrismaService,
                private live: LiveGateway,
                private sanctions: SanctionsService,
    ){}

    //PUBLIC -Get match timeline

    async getByMatch(matchId:string){
        const events = await this.prisma.match_events.findMany({
            where: { match_id: matchId},
            include: {
                players_match_events_player_idToplayers: {
                    select: {
                        first_name: true,
                        last_name: true,
                    },
                },
            },
        });

        return events.sort((a, b) => {
            const aSort = this.getMinuteSortValue(a.minute);
            const bSort = this.getMinuteSortValue(b.minute);
            return aSort - bSort;
        });
    }

    //Create event
    async createEvent(data:{
        match_id: string;
        team_id:string;
        player_id: string;
        minute?: string | null;
        event_type:
            | 'GOAL'
            | 'YELLOW'
            | 'DOBLE_YELLOW_RED'
            | 'RED_DIRECT'
            | 'SUB_IN'
            | 'SUB_OUT'
            | 'PENALTY_CONVERTED'
            | 'PENALTY_MISSED'
            | 'OWN_GOAL';
        related_player_id?: string;
    }){

        const result = await this.prisma.$transaction(async (tx)=>{
            //Validate match
            const match = await tx.matches.findUnique({
                where: { id: data.match_id},
            });

            if(
                !match ||
                !PLAYING_STATUSES.includes(match.status)
            ){
                throw new BadRequestException(
                    'Los eventos solo se pueden añadir durante los partidos',
                );
            }

            if (EXTRA_STATUSES.includes(match.status) && !isKnockoutJournal(match.journal)) {
                throw new BadRequestException('La prorroga y los penales requieren eliminacion directa');
            }
            const isPenalty = ['PENALTY_CONVERTED', 'PENALTY_MISSED'].includes(data.event_type);
            let normalizedMinute: string | null;
            if (isPenalty) {
                if (match.status !== 'PENALTIES' || data.minute != null) {
                    throw new BadRequestException('Los penales solo se registran en PENALTIES y sin minuto');
                }
                normalizedMinute = null;
            } else {
                if (match.status === 'PENALTIES') {
                    throw new BadRequestException('En PENALTIES solo se registran penales convertidos o fallados');
                }
                this.validateMinuteByMatchStatus(match.status, data.minute);
                normalizedMinute = this.normalizeMinuteValue(data.minute);
            }

            //Validate lineup participation
            const lineupPlayer = await tx.match_lineup.findFirst({
                where: {
                    match_id: data.match_id,
                    team_id: data.team_id,
                    player_id: data.player_id,
                },
            });

            if(!lineupPlayer){
                throw new BadRequestException(
                    'El jugador no está en la alineación'
                );
            }

            //Substitution validation
            if(
                ['SUB_IN', 'SUB_OUT'].includes(data.event_type)
            ){
                if(!data.related_player_id){
                    throw new BadRequestException(
                        'La sustitución requiere un jugador relacionado'
                    );
                }
            }

            //Create event
            const event = await tx.match_events.create({
                data: {
                    ...data,
                    minute: normalizedMinute,
                },
            });

            //Update match score
            const updateMatch = await this.updateScore(tx, match, data);

            //Update player statistics
            await this.updatePlayerStats(tx, match.season_id, data);

            if(this.isCardEvent(data.event_type)){
                await this.sanctions.handleCardEvent({
                    match_id: data.match_id,
                    player_id: data.player_id,
                    team_id: data.team_id,
                    season_id: match.season_id,
                    event_type: data.event_type,
                }, tx);
            }

            return {event, match, updateMatch};
        });

        this.live.broadcastMatchEvent(
                data.match_id,
                result.event
        );

        if(result.updateMatch){
                this.live.broadcastScoreUpdate(
                    data.match_id,
                    {
                        home_score: result.updateMatch.home_score,
                        away_score: result.updateMatch.away_score,
                    });
        }
        
        return result.event;
    }

    async deleteEvent(eventId: string){
        const result = await this.prisma.$transaction(async (tx) => {
            const event = await tx.match_events.findUnique({
                where: { id: eventId },
                include: {
                    matches: {
                        select: {
                            id: true,
                            season_id: true,
                            status: true,
                            home_team_id: true,
                            away_team_id: true,
                            home_score: true,
                            away_score: true,
                        },
                    },
                },
            });

            if(!event){
                throw new BadRequestException('Evento no encontrado');
            }

            if(
                !event.matches ||
                !PLAYING_STATUSES.includes(event.matches.status)
            ){
                throw new BadRequestException(
                    'Los eventos solo se pueden eliminar durante los partidos',
                );
            }

            const updatedMatch = await this.revertScore(tx, event.matches, event);
            await this.revertPlayerStats(tx, event.matches.season_id, event);

            if(event.event_type === 'RED_DIRECT'){
                await tx.sanctions.deleteMany({
                    where: {
                        season_id: event.matches.season_id,
                        match_id: event.match_id,
                        player_id: event.player_id,
                        type: 'SUSPENSION',
                        reason: 'Roja directa',
                    },
                });
            }

            if(
                event.event_type === 'YELLOW' ||
                event.event_type === 'DOBLE_YELLOW_RED'
            ){
                await tx.sanctions.deleteMany({
                    where: {
                        season_id: event.matches.season_id,
                        match_id: event.match_id,
                        player_id: event.player_id,
                        type: 'SUSPENSION',
                        reason: {
                            contains: 'amarilla',
                        },
                    },
                });
            }

            await tx.match_events.delete({
                where: { id: eventId },
            });

            return {
                event,
                updatedMatch,
            };
        });

        if(result.updatedMatch){
            this.live.broadcastScoreUpdate(result.event.match_id, {
                home_score: result.updatedMatch.home_score,
                away_score: result.updatedMatch.away_score,
            });
        }

        return {
            message: 'Evento eliminado correctamente',
            event_id: result.event.id,
        };
    }

     isCardEvent(type: string,): type is 'YELLOW' | 'DOBLE_YELLOW_RED' | 'RED_DIRECT' 
     {
        return (
            type === 'YELLOW' ||
            type === 'DOBLE_YELLOW_RED' ||
            type === 'RED_DIRECT'
        );
     }

    //SCORE UPDATE
    private async updateScore(
        tx: Prisma.TransactionClient,
        match: any,
        data:any,
    ){
        if(!['GOAL', 'OWN_GOAL'].includes(data.event_type)){
            return;
        }

        let homeScore = match.home_score;
        let awayScore = match.away_score;

        const isHomeTeam = data.team_id === match.home_team_id;

        if(data.event_type === 'GOAL'){
            if(isHomeTeam) homeScore++;
            else awayScore++;
        }

        if(data.event_type === 'OWN_GOAL'){
            if(isHomeTeam) awayScore++;
            else homeScore++;
        }

        return await tx.matches.update({
            where: {id: match.id},
            data: {
                home_score: homeScore,
                away_score: awayScore,
            },
        });
    }

    private async revertScore(
        tx: Prisma.TransactionClient,
        match: any,
        data: any,
    ){
        if(!['GOAL', 'OWN_GOAL'].includes(data.event_type)){
            return;
        }

        let homeScore = match.home_score;
        let awayScore = match.away_score;

        const isHomeTeam = data.team_id === match.home_team_id;

        if(data.event_type === 'GOAL'){
            if(isHomeTeam) homeScore = Math.max(0, homeScore - 1);
            else awayScore = Math.max(0, awayScore - 1);
        }

        if(data.event_type === 'OWN_GOAL'){
            if(isHomeTeam) awayScore = Math.max(0, awayScore - 1);
            else homeScore = Math.max(0, homeScore - 1);
        }

        return await tx.matches.update({
            where: { id: match.id },
            data: {
                home_score: homeScore,
                away_score: awayScore,
            },
        });
    }


    //PLAYER STATS UPDATE
    private async updatePlayerStats(
        tx:Prisma.TransactionClient,
        seasonId: string,
        data: any,
    ){
        const stats = {
            goals: data.event_type === 'GOAL' ? 1 : 0,
            yellow_cards: data.event_type === 'YELLOW' ? 1 : 0,
            red_cards:
                data.event_type === 'DOBLE_YELLOW_RED' ||
                data.event_type === 'RED_DIRECT'
                    ? 1
                    : 0,
        };

        if(
            stats.goals === 0 &&
            stats.yellow_cards === 0 &&
            stats.red_cards === 0
        ){
            return;
        }

        await tx.player_statistics.upsert({
            where : {
                player_id_season_id: {
                    player_id: data.player_id,
                    season_id: seasonId,
                },
            },
            update: {
                goals: {increment: stats.goals},
                yellow_cards: {increment: stats.yellow_cards},
                red_cards: {increment: stats.red_cards},
            },
            create: {
                player_id: data.player_id,
                season_id: seasonId,
                goals: stats.goals,
                assists: 0,
                yellow_cards: stats.yellow_cards,
                red_cards: stats.red_cards
            },
        });
    }

    private async revertPlayerStats(
        tx: Prisma.TransactionClient,
        seasonId: string,
        data: any,
    ){
        const stats = {
            goals: data.event_type === 'GOAL' ? 1 : 0,
            yellow_cards: data.event_type === 'YELLOW' ? 1 : 0,
            red_cards:
                data.event_type === 'DOBLE_YELLOW_RED' ||
                data.event_type === 'RED_DIRECT'
                    ? 1
                    : 0,
        };

        if(
            stats.goals === 0 &&
            stats.yellow_cards === 0 &&
            stats.red_cards === 0
        ){
            return;
        }

        await tx.player_statistics.updateMany({
            where: {
                player_id: data.player_id,
                season_id: seasonId,
            },
            data: {
                goals: { decrement: stats.goals },
                yellow_cards: { decrement: stats.yellow_cards },
                red_cards: { decrement: stats.red_cards },
            },
        });
    }

    private validateMinuteByMatchStatus(status: string, minuteValue?: string | null) {
        const parsed = this.parseMinuteValue(minuteValue);
        const periods: Record<string, string> = {
            PLAYING_FIRST_HALF: '1t',
            PLAYING_SECOND_HALF: '2t',
            PLAYING_FIRST_EXTRA_HALF: '1te',
            PLAYING_SECOND_EXTRA_HALF: '2te',
        };
        if (parsed.period !== periods[status]) {
            throw new BadRequestException('Para este tiempo usa formato "X ' + periods[status] + '"');
        }
    }

    private parseMinuteValue(value?: string | null) {
        const match = typeof value === 'string' ? value.trim().match(/^(\d+)\s*([12]te?)$/i) : null;
        if (!match) {
            throw new BadRequestException('Minuto obligatorio: usa "10 1t", "20 2t", "5 1te" o "10 2te"');
        }
        const minute = Number(match[1]);
        const period = match[2].toLowerCase();
        if (!Number.isSafeInteger(minute) || (minute + ' ' + period).length > 12) {
            throw new BadRequestException('Minuto invalido');
        }
        return { minute, period };
    }

    private normalizeMinuteValue(value?: string | null) {
        const parsed = this.parseMinuteValue(value);
        return parsed.minute + ' ' + parsed.period;
    }

    private getMinuteSortValue(value: string | null) {
        try {
            const parsed = this.parseMinuteValue(value);
            const periodIndex = ['1t', '2t', '1te', '2te'].indexOf(parsed.period);
            return periodIndex * 1_000_000_000 + parsed.minute;
        } catch {
            return Number.MAX_SAFE_INTEGER;
        }
    }
}
