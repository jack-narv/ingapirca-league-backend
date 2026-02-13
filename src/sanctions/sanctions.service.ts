import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SanctionsService {
    constructor(private prisma: PrismaService){}

    async handleCardEvent(data : {
        match_id: string;
        player_id: string;
        team_id: string;
        season_id: string;
        event_type: 'YELLOW' | 'RED';
    }){
        if(data.event_type === 'YELLOW'){
            await this.handleYellow(data);
        }

        if(data.event_type === 'RED'){
            await this.handleRed(data);
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
                matchs: 1,
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


    //RED CARD LOGIC
    private async handleRed(data: any){
        await this.createSuspension({
            ...data,
            reason: 'Roja directa',
            matches: 3,
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
        });

        if(exists) return;

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
