import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PlayersService {
    constructor(private prisma: PrismaService){}

    //PUBLIC - list all players
    async findAll(){
        return this.prisma.players.findMany({
            orderBy: {last_name: 'asc'},
        });
    }

    //PUBLIC - get player details
    async findOne(playerId:string){
        return this.prisma.players.findUnique({
            where: {id:playerId},
            include: {
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
        date_of_birth: string;
        nationality: string;
        photo_url?: string;
    }){
        //Optional: basic duplicate protection

        const exists = await this.prisma.players.findFirst({
            where:{
                first_name: data.first_name,
                last_name: data.last_name,
                date_of_birth: new Date(data.date_of_birth),
            },
        });

        if(exists){
            throw new BadRequestException(
                'Player already exists',
            );
        }

        return this.prisma.players.create({
            data:{
                ...data,
                date_of_birth: new Date(data.date_of_birth),
            },
        });
    }


    //Assign player to team (squad)
    async assignToTeam(data:{
        player_id: string;
        team_id: string;
        shirt_number: number;
        position: 'GK' | 'DF' | 'MF' | 'FW';
    }){
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

}
