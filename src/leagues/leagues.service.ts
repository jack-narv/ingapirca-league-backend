import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class LeaguesService {
    constructor(private prisma: PrismaService){}

    findAll(){
        return this.prisma.leagues.findMany();
    }

    create(data: {
        name: string;
        country: string;
        city: string;
    }){
        return this.prisma.leagues.create({data});
    }
}
