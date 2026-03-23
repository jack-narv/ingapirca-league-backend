import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { parseDateOnlyUtc } from 'src/date-time.util';

@Injectable()
export class PlayersService {
    constructor(private prisma: PrismaService){}

    private readonly playerPublicSelect = {
        id: true,
        first_name: true,
        last_name: true,
        date_of_birth: true,
        nationality: true,
        photo_url: true,
    } as const;

    //PUBLIC - list all players
    async findAll(){
        return this.prisma.players.findMany({
            orderBy: {last_name: 'asc'},
            select: this.playerPublicSelect,
        });
    }

    //PUBLIC - get player details
    async findOne(playerId:string){
        return this.prisma.players.findUnique({
            where: {id:playerId},
            select: {
                ...this.playerPublicSelect,
                team_player: {
                    where: {left_at: null},
                    include: {teams: true},
                },
            },
        });
    }

    //ADMIN / LEAGUE_ADMIN - create player
    async createPlayer(data:{
        first_name: string;
        last_name:string;
        season_id?: string;
        identity_card: string;
        date_of_birth: string;
        nationality: string;
        photo_url?: string;
    }){
        const {
            season_id: _seasonIdForScopeOnly,
            ...playerData
        } = data;

        if(!/^\d{10}$/.test(data.identity_card)){
            throw new BadRequestException('identity_card must contain exactly 10 digits');
        }

        //Optional: basic duplicate protection

        const exists = await this.prisma.players.findFirst({
            where:{
                first_name: data.first_name,
                last_name: data.last_name,
                date_of_birth: parseDateOnlyUtc(data.date_of_birth),
            },
        });

        if(exists){
            throw new BadRequestException(
                'Player already exists',
            );
        }

        return this.prisma.players.create({
            data:{
                ...playerData,
                date_of_birth: parseDateOnlyUtc(data.date_of_birth),
            },
            select: this.playerPublicSelect,
        });
    }


    //Assign player to team (squad)
    async assignToTeam(data:{
        player_id: string;
        team_id: string;
        shirt_number: number;
        position: 'GK' | 'DF' | 'MF' | 'FW';
    }){
        const [player, targetTeam] = await Promise.all([
            this.prisma.players.findUnique({
                where: {id: data.player_id},
                select: {identity_card: true},
            }),
            this.prisma.teams.findUnique({
                where: {id: data.team_id},
                select: {season_id: true},
            }),
        ]);

        if(!player){
            throw new BadRequestException('Player not found');
        }

        if(!targetTeam){
            throw new BadRequestException('Team not found');
        }

        // In a season, a player (identified by identity_card) can belong to only one team.
        const seasonAssignment = await this.prisma.team_player.findFirst({
            where: {
                team_id: {not: data.team_id},
                players: {
                    is: {identity_card: player.identity_card},
                },
                teams: {
                    is: {season_id: targetTeam.season_id},
                },
            },
            select: {
                id: true,
                team_id: true,
            },
        });

        if(seasonAssignment){
            throw new BadRequestException(
                'El jugador ya pertenece a otro equipo en esta temporada.',
            );
        }

        //Ensure player not already active
        const active = await this.prisma.team_player.findFirst({
            where:{
                player_id: data.player_id,
                left_at: null,
            },
        });

        if(active){
            throw new BadRequestException(
                'El jugador ya se encuentra asignado a un equipo.'
            );
        }

        //Shirt number unique per team
        const shirtUsed = await this.prisma.team_player.findFirst({
            where: {
                team_id: data.team_id,
                shirt_number: data.shirt_number,
                left_at: null,
            },
        });

        if(shirtUsed){
            throw new BadRequestException(
                'El número de la camiseta ya se estpa usando en este equipo.'
            );
        }

        return this.prisma.team_player.create({
            data:{
                player_id: data.player_id,
                team_id: data.team_id,
                shirt_number: data.shirt_number,
                position: data.position,
                joined_at: new Date(),
            },
        });
    }

    //Remove player from team
    async releaseFromTeam(teamPlayerId:string){
        return this.prisma.team_player.update({
            where: {id: teamPlayerId},
            data: { left_at: new Date()},
        });
    }

    //Get players by team
    async getByTeam(teamId: string) {
        return this.prisma.team_player.findMany({
            where: {
            team_id: teamId,
            left_at: null,
            },
            include: {
            players: {
                select: this.playerPublicSelect,
            },
            },
        });
    }


}
