import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AssignRefereeDto } from './dto/assign-referee.dto';
import { RateRefereeDto } from './dto/rate-referee.dto';

@Injectable()
export class RefereesService {
    constructor(private prisma: PrismaService){}

    //CREATE
    create(data:{
        first_name: string;
        last_name: string;
        license_number: string;
        phone?: string
    }){
        return this.prisma.referees.create({
            data:{
                ...data,
                is_active: true,
            },
        });
    }

    //LIST
    findAll(){
        return this.prisma.referees.findMany({
            where: {is_active: true},
            orderBy: {last_name: 'asc'},
        });
    }

    //DEACTIVATE
    async deactivate(id:string){
        const referee = await this.prisma.referees.findUnique({where: {id}});

        if(!referee) throw new NotFoundException('Árbitro no encontrado');

        return this.prisma.referees.update({
            where: {id},
            data: {is_active: false},
        });
    }

    //ASSIGM REFEREE TO MATCH
    async assignToMatch(data: AssignRefereeDto){
        return this.prisma.match_referees.create({
            data,
        });
    }

    
    //RATING REFEREE
    async rateReferee(data: RateRefereeDto){
        return this.prisma.referee_ratings.create({
            data,
        });
    }


    //OBSERVATIONS
    async submitObservation(
        matchRefereeId: string,
        observation: string,
    ){
        return this.prisma.match_referees.update({
            where: {id:matchRefereeId},
            data: {
                observation,
                submitted_at: new Date(),
            },
        });
    }


    //GET REFEREES FROM MATCHES
    getRefereeMatches(refereeId: string){
        return this.prisma.match_referees.findMany({
            where: { referee_id: refereeId},
            include: {
                matches: true,
            },
        });
    }


    //AVERAGE RATINGS
    getAverageRating(refereeId: string){
        return this.prisma.referee_ratings.aggregate({
            where: { referee_id: refereeId},
            _avg: { rating: true},
        });
    }

}
