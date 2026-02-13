import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
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
        return this.prisma.match_events.findMany({
            where: { match_id: matchId},
            orderBy: { minute: 'asc' },
        });
    }

    //Create event
    async createEvent(data:{
        match_id: string;
        team_id:string;
        player_id: string;
        minute: number;
        event_type:
            | 'GOAL'
            | 'YELLOW'
            | 'RED'
            | 'SUB_IN'
            | 'SUB_OUT'
            | 'OWN_GOAL';
        related_player_id?: string;
    }){

        const result = await this.prisma.$transaction(async (tx)=>{
            //Validate match
            const match = await tx.matches.findUnique({
                where: { id: data.match_id},
            });

            if(!match || match.status !== 'PLAYING'){
                throw new BadRequestException(
                    'Los eventos solo se pueden añadir durante los partidos',
                );
            }

            if(data.minute < 0 || data.minute > 130){
                throw new BadRequestException('Invalid minute');
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
                data,
            });

            //Update match score
            const updateMatch = await this.updateScore(tx, match, data);

            //Update player statistics
            await this.updatePlayerStats(tx, match.season_id, data);

            return {event, match, updateMatch};
        });

        if(this.isCardEvent(data.event_type)){
            await this.sanctions.handleCardEvent({
                match_id: data.match_id,
                player_id: data.player_id,
                team_id: data.team_id,
                season_id: result.match.season_id,
                event_type: data.event_type,
            })
        }

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

     isCardEvent(type: string,): type is 'YELLOW' | 'RED' 
     {
        return type === 'YELLOW' || type === 'RED';
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


    //PLAYER STATS UPDATE
    private async updatePlayerStats(
        tx:Prisma.TransactionClient,
        seasonId: string,
        data: any,
    ){
        const stats = {
            goals: data.event_type === 'GOAL' ? 1 : 0,
            yellow_cards: data.event_type === 'YELLOW' ? 1 : 0,
            red_cards: data.event_type === 'RED' ? 1 : 0,
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
}

