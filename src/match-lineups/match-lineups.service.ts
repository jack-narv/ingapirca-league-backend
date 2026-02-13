import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class MatchLineupsService {
    constructor(private prisma: PrismaService){}

    async getLineup(matchId:string, teamId:string){
        return this.prisma.match_lineup.findMany({
            where: {
                match_id: matchId,
                team_id: teamId,
            },
            orderBy: [
                {is_starting: 'desc'},
                {position: 'asc'},
            ],
        });
    }

    async submitLineup(
        userId: string,
        data: {
            match_id: string;
            team_id: string;
            players: {
                player_id: string;
                shirt_number: number;
                position: 'GK' | 'DF' | 'MF' |'FW';
                is_starting:boolean;
            }[];
        },
    ){
        const match = await this.prisma.matches.findUnique({
            where: {id: data.match_id},
        });

        if(!match || match.status !== 'SCHEDULED'){
            throw new BadRequestException(
                'Las alineaciones pueden ser enviadas antes de que el partido empiece.'
            );
        }

        const startingCount = data.players.filter(
            (p) => p.is_starting,
        ).length;

        if(startingCount > 11){
            throw new BadRequestException(
                'Un máximo de 11 jugadores están permitidos.'
            );
        }

        // CHECK SUSPENSIONS
        for (const player of data.players) {
            const suspended = await this.isPlayerSuspended(
            player.player_id,
            data.match_id,
            );

            if (suspended) {
            throw new BadRequestException(
                `El jugador ${player.player_id} está suspendido y no puede ser alineado.`,
                );
            }
        }

        // Remove previous lineup (re-submit allowed before start)
        await this.prisma.match_lineup.deleteMany({
            where:{
                match_id: data.match_id,
                team_id: data.team_id,
            },
        });

        const records = data.players.map((p)=>({
            match_id:data.match_id,
            team_id: data.team_id,
            player_id: p.player_id,
            shirt_number: p.shirt_number,
            position: p.position,
            is_starting:p.is_starting,
            submitted_by: userId,
            submitted_at: new Date(),
        }));

        return this.prisma.match_lineup.createMany({
            data:records,
        });
    }

    private async isPlayerSuspended(
        playerId: string,
        matchId: string,
    ): Promise<boolean>{
        const match = await this.prisma.matches.findUnique({
            where:{ id:matchId},
            select: { season_id: true, match_date: true},
        });

        if(!match) return false;

        const suspension = await this.prisma.sanctions.findFirst({
            where: {
                player_id: playerId,
                season_id: match.season_id,
                type: 'SUSPENSION',
            },
            orderBy: {start_date: 'desc'},
        });

        if(!suspension) return false;

        //Count matches already served
        const playedMatchesAfterSuspension = 
            await this.prisma.matches.count({
                where: {
                    season_id: match.season_id,
                    status: 'PLAYED',
                    match_date: {
                        gt: suspension.start_date!,
                    },
                },
            });

        return playedMatchesAfterSuspension < suspension.matches_affected!;
    }
}
