import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SanctionsService } from 'src/sanctions/sanctions.service';

@Injectable()
export class MatchLineupsService {
    constructor(
        private prisma: PrismaService,
        private sanctionsService: SanctionsService,
    ){}

    async getLineup(matchId:string, teamId:string){
        return this.prisma.match_lineup.findMany({
            where: {
                match_id: matchId,
                team_id: teamId,
            },
            include: {
                players: {
                    select: {
                        first_name: true,
                        last_name: true,
                    },
                },
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

        if(!match){
            throw new BadRequestException(
                'Partido no encontrado.',
            );
        }

        if(match.status === 'PLAYED'){
            throw new BadRequestException(
                'Las alineaciones no se pueden editar cuando el partido ya fue finalizado.',
            );
        }

        const startingCount = data.players.filter(
            (p) => p.is_starting,
        ).length;

        if(startingCount > 11){
            throw new BadRequestException(
                'Un maximo de 11 jugadores estan permitidos.',
            );
        }

        const suspendedPlayers =
            await this.sanctionsService.getSuspendedPlayersForMatch(
                data.match_id,
                data.team_id,
            );

        const suspendedPlayerIds = new Set(
            suspendedPlayers.map((player) => player.player_id),
        );

        for (const player of data.players) {
            if (!suspendedPlayerIds.has(player.player_id)) {
                continue;
            }

            const suspendedPlayer = suspendedPlayers.find(
                (item) => item.player_id === player.player_id,
            );
            const fullName = suspendedPlayer
                ? `${suspendedPlayer.first_name} ${suspendedPlayer.last_name}`
                : player.player_id;

            throw new BadRequestException(
                `El jugador ${fullName} esta suspendido y no puede ser alineado.`,
            );
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
}
