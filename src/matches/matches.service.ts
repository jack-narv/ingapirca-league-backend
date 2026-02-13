import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { LiveGateway } from 'src/live/live.gateway';

@Injectable()
export class MatchesService {
    constructor(private prisma: PrismaService,
                private live: LiveGateway
    ){}

    async findBySeason(seasonId: string){
        return this.prisma.matches.findMany({
            where: {season_id: seasonId},
            orderBy: {match_date: 'asc'},
        });
    }

    async createMatch(data:{
        season_id: string;
        home_team_id: string;
        away_team_id: string;
        venue_id: string;
        match_date: Date;
        observations?: string;
    }){
        if(data.home_team_id === data.away_team_id){
            throw new BadRequestException(
                'Equipo local y visitante deben ser diferentes',
            );
        }

        const teams = await this.prisma.teams.findMany({
            where:{
                id: {in:[data.home_team_id, data.away_team_id]},
                season_id: data.season_id,
            },
        });

        if(teams.length !== 2){
            throw new BadRequestException(
                'Ambos equipos deben pertencer a la misma temporada'
            );
        }

        return this.prisma.matches.create({
            data: {
                ...data,
                status: 'SCHEDULED',
                home_score: 0,
                away_score: 0,
            },
        });
    }


    async startMatch(matchId: string){
        const match = await this.prisma.matches.findUnique({
            where: {id: matchId},
        });

        if(!match){
            throw new NotFoundException('Partido no encontrado');
        }

        if(match.status !== 'SCHEDULED'){
            throw new BadRequestException(
                'Solo los partidos agendados pueden empezar',
            );
        }

        const matchUpdate = await this.prisma.matches.update({
            where: {id:matchId},
            data: {status: 'PLAYING'},
        });

        this.live.broadcastMatchStart(matchId);

        return matchUpdate;
    }

    async finishMatch(matchId: string, homeScore: number, awayScore:number, observations?:string){
        
        const result = await this.prisma.$transaction(async (tx)=>{
                const match = await tx.matches.findUnique({
                    where: {id: matchId},
                });

                if(!match){
                    throw new NotFoundException('Partido no encontrado');
                }

                if(match.status !== 'PLAYING'){
                    throw new BadRequestException(
                        'Solo los partidos en juego pueden terminar'
                    );
                }

                const updateMatch = await tx.matches.update({
                    where: {id: matchId},
                    data: {
                        status: 'PLAYED',
                        home_score: homeScore,
                        away_score: awayScore,
                        observations
                    },
                });

                await this.updateStandings(tx, updateMatch);

                return updateMatch;
        }); 

        this.live.broadcastMatchFinish(matchId,{
                    homeScore,
                    awayScore,
        });

        return result;
    }

    async cancelMatch(matchId:string, observations?:string){
        const match = await this.prisma.matches.findUnique({
            where: {id:matchId},
        });

        if(!match){
            throw new NotFoundException('Partido no encontrado');
        }

        if(match.status === 'PLAYED'){
            throw new BadRequestException(
                'Los partidos jugados no se pueden cancelar'
            );
        }

        return this.prisma.matches.update({
            where: {id:matchId},
            data : {
                status: 'CANCELED',
                observations,
            },
        });
    }

    private async updateStandings(
        tx: Prisma.TransactionClient,
        match: any,
    ){
        const homeGoals = match.home_score;
        const awayGoals = match.away_score;

        let home = {win: 0, draw: 0, loss: 0, points: 0};
        let away = {win: 0, draw: 0, loss: 0, points: 0};

        if(homeGoals > awayGoals){
            home = {win: 1, draw: 0, loss: 0, points: 3};
            away = {win: 0, draw: 0, loss: 1, points: 0};
        }else if(homeGoals < awayGoals){
            home = {win: 0, draw: 0, loss: 1, points: 0};
            away = {win: 1, draw: 0, loss: 0, points: 3};
        }else{
            home = {win: 0, draw: 1, loss: 0, points: 1};
            away = {win: 0, draw: 1, loss: 0, points: 1};
        }

        await Promise.all([
            tx.standings.upsert({
                where: {
                    season_id_team_id: {
                        season_id: match.season_id,
                        team_id: match.home_team_id,
                    },
                },
                update: {
                    played: { increment: 1},
                    wins: { increment: home.win},
                    draws: { increment: home.draw},
                    losses: { increment: home.loss},
                    goals_for: { increment: homeGoals},
                    goals_against: { increment: awayGoals},
                    points: { increment: home.points},
                },
                create: {
                    season_id: match.season_id,
                    team_id: match.home_team_id,
                    played: 1,
                    wins:home.win,
                    draws: home.draw,
                    losses: home.loss,
                    goals_for: homeGoals,
                    goals_against: awayGoals,
                    points: home.points,
                },
            }),

            tx.standings.upsert({
                where: {
                    season_id_team_id: {
                        season_id: match.season_id,
                        team_id: match.away_team_id
                    },
                },
                update:{
                    played: { increment: 1},
                    wins: {increment: away.win},
                    draws: {increment:away.draw},
                    losses: { increment: away.loss},
                    goals_for: { increment: awayGoals},
                    goals_against: { increment:homeGoals},
                    points: { increment: away.points},
                },
                create: {
                    season_id: match.season_id,
                    team_id: match.away_team_id,
                    played: 1,
                    wins: away.win,
                    draws: away.draw,
                    losses: away.loss,
                    goals_for: awayGoals,
                    goals_against: homeGoals,
                    points: away.points,
                },
            }),
        ]);
    }
}
