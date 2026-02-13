import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SeasonsService {
    constructor(private prisma: PrismaService){}

    findByLeague(leagueId: string){
        return this.prisma.seasons.findMany({
            where: {league_id: leagueId},
        });
    }

    create(data: {
        league_id: string;
        name: string;
        start_date: Date;
        end_date: Date;
    }) {
        return this.prisma.seasons.create({
            data: {
                ...data,
                status: 'PLANNED',
            }
        })
    }
}
