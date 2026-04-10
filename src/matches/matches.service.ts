import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { LiveGateway } from 'src/live/live.gateway';

@Injectable()
export class MatchesService {
    constructor(private prisma: PrismaService,
                private live: LiveGateway
    ){}

    async findBySeason(seasonId: string, categoryId?: string){
        return this.prisma.matches.findMany({
            where: {
                season_id: seasonId,
                ...(categoryId ? { category_id: categoryId } : {}),
            },
            orderBy: {match_date: 'asc'},
        });
    }

    async findById(matchId: string){
        const match = await this.prisma.matches.findUnique({
            where: {id: matchId},
        });

        if(!match){
            throw new NotFoundException('Partido no encontrado');
        }

        return match;
    }

    async createMatch(data:{
        season_id: string;
        category_id?: string;
        journal: string;
        home_team_id: string;
        away_team_id: string;
        venue_id: string;
        match_date: Date;
        observations?: string;
    }){
        const normalizedJournal = this.normalizeJournal(data.journal);
        const journalValues = this.getEquivalentJournalValues(normalizedJournal);

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

        const homeTeam = teams.find((t) => t.id === data.home_team_id);
        const awayTeam = teams.find((t) => t.id === data.away_team_id);

        if (!homeTeam || !awayTeam) {
            throw new BadRequestException('Equipos invalidos');
        }

        if (homeTeam.category_id !== awayTeam.category_id) {
            throw new BadRequestException(
                'Los equipos deben pertenecer a la misma categoria',
            );
        }

        const effectiveCategoryId = data.category_id ?? homeTeam.category_id ?? null;

        if (data.category_id) {
            const category = await this.prisma.season_categories.findFirst({
                where: {
                    id: data.category_id,
                    season_id: data.season_id,
                },
            });

            if (!category) {
                throw new BadRequestException(
                    'La categoria no existe en la temporada',
                );
            }
        }

        if (homeTeam.category_id !== effectiveCategoryId) {
            throw new BadRequestException(
                'La categoria del partido no coincide con la categoria de los equipos',
            );
        }

        const teamsInJournal = await this.prisma.matches.findFirst({
            where: {
                season_id: data.season_id,
                category_id: effectiveCategoryId,
                journal: { in: journalValues },
                status: { in: ['SCHEDULED', 'PLAYING', 'PLAYED'] },
                OR: [
                    {
                        home_team_id: {
                            in: [data.home_team_id, data.away_team_id],
                        },
                    },
                    {
                        away_team_id: {
                            in: [data.home_team_id, data.away_team_id],
                        },
                    },
                ],
            },
            select: { id: true },
        });

        if (teamsInJournal) {
            throw new BadRequestException(
                'Uno de los equipos ya tiene un partido en esta jornada.',
            );
        }

        return this.prisma.matches.create({
            data: {
                ...data,
                journal: normalizedJournal,
                category_id: effectiveCategoryId,
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

    async finishMatch(
        matchId: string,
        homeScore: number,
        awayScore: number,
        observations?: string,
        bestPlayerId?: string,
        bestGoalkeeperId?: string,
    ){
        
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

                if (bestPlayerId) {
                    const bestPlayerInLineup = await tx.match_lineup.findFirst({
                        where: {
                            match_id: matchId,
                            player_id: bestPlayerId,
                        },
                        select: { id: true },
                    });

                    if (!bestPlayerInLineup) {
                        throw new BadRequestException(
                            'El mejor jugador debe estar en la alineacion del partido.',
                        );
                    }
                }

                if (bestGoalkeeperId) {
                    const bestGoalkeeperInLineup = await tx.match_lineup.findFirst({
                        where: {
                            match_id: matchId,
                            player_id: bestGoalkeeperId,
                        },
                        select: { id: true },
                    });

                    if (!bestGoalkeeperInLineup) {
                        throw new BadRequestException(
                            'El mejor arquero debe estar en la alineacion del partido.',
                        );
                    }
                }

                const updateMatch = await tx.matches.update({
                    where: {id: matchId},
                    data: {
                        status: 'PLAYED',
                        home_score: homeScore,
                        away_score: awayScore,
                        observations,
                        best_player_id: bestPlayerId ?? null,
                        best_goalkeeper_id: bestGoalkeeperId ?? null,
                    },
                });

                return updateMatch;
        }); 

        this.live.broadcastScoreUpdate(matchId, {
            homeScore,
            awayScore,
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

    private normalizeJournal(journal: string) {
        const value = journal?.trim();

        if (!value) {
            throw new BadRequestException('La jornada es obligatoria.');
        }

        if (/^\d+$/.test(value)) {
            return `JOURNAL ${parseInt(value, 10)}`;
        }

        const leagueMatch = value.match(/^JOURNAL\s+(\d+)$/i);
        if (leagueMatch) {
            return `JOURNAL ${parseInt(leagueMatch[1], 10)}`;
        }

        return value.toUpperCase();
    }

    private getEquivalentJournalValues(journal: string) {
        const values = new Set<string>([journal]);

        const leagueMatch = journal.match(/^JOURNAL\s+(\d+)$/i);
        if (leagueMatch) {
            values.add(String(parseInt(leagueMatch[1], 10)));
        }

        return Array.from(values);
    }
}
