import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AssignRefereeDto } from './dto/assign-referee.dto';
import { CreateRefereeDto } from './dto/create-referee.dto';

@Injectable()
export class RefereesService {
    constructor(private prisma: PrismaService){}

    //CREATE
    async create(data: CreateRefereeDto){
        const season = await this.prisma.seasons.findUnique({
            where: { id: data.season_id },
            select: { id: true },
        });

        if (!season) {
            throw new NotFoundException('Temporada no encontrada.');
        }

        return this.prisma.referees.create({
            data:{
                ...data,
                is_active: true,
            },
        });
    }

    //LIST
    async findAllBySeason(seasonId: string){
        const season = await this.prisma.seasons.findUnique({
            where: { id: seasonId },
            select: { id: true },
        });

        if (!season) {
            throw new NotFoundException('Temporada no encontrada.');
        }

        return this.prisma.referees.findMany({
            where: {
                season_id: seasonId,
                is_active: true,
            },
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
        const [match, referee] = await Promise.all([
            this.prisma.matches.findUnique({
                where: { id: data.match_id },
                select: { id: true, season_id: true },
            }),
            this.prisma.referees.findUnique({
                where: { id: data.referee_id },
                select: { id: true, is_active: true, season_id: true },
            }),
        ]);

        if (!match) {
            throw new NotFoundException('Partido no encontrado.');
        }

        if (!referee) {
            throw new NotFoundException('Arbitro no encontrado.');
        }

        if (!referee.is_active) {
            throw new BadRequestException('El arbitro esta inactivo.');
        }

        if (match.season_id !== referee.season_id) {
            throw new BadRequestException(
                'El arbitro no pertenece a la temporada de este partido.',
            );
        }

        const [sameRole, sameReferee] = await Promise.all([
            this.prisma.match_referees.findFirst({
                where: {
                    match_id: data.match_id,
                    role: data.role,
                },
                select: { id: true },
            }),
            this.prisma.match_referees.findFirst({
                where: {
                    match_id: data.match_id,
                    referee_id: data.referee_id,
                },
                select: { id: true },
            }),
        ]);

        if (sameRole) {
            throw new BadRequestException(
                'El rol ya tiene un arbitro asignado para este partido.',
            );
        }

        if (sameReferee) {
            throw new BadRequestException(
                'El arbitro ya esta asignado a este partido.',
            );
        }

        return this.prisma.match_referees.create({
            data,
        });
    }

    //OBSERVATIONS
    async submitObservation(
        matchRefereeId: string,
        observation: string,
    ){
        const assignment = await this.prisma.match_referees.findUnique({
            where: { id: matchRefereeId },
            select: { id: true },
        });

        if (!assignment) {
            throw new NotFoundException(
                'Asignacion de arbitro no encontrada.',
            );
        }

        return this.prisma.match_referees.update({
            where: {id:matchRefereeId},
            data: {
                observation,
                submitted_at: new Date(),
            },
        });
    }


    //GET REFEREES FROM MATCHES
    async getByMatch(matchId: string){
        const match = await this.prisma.matches.findUnique({
            where: { id: matchId },
            select: { id: true },
        });

        if (!match) {
            throw new NotFoundException('Partido no encontrado.');
        }

        return this.prisma.match_referees.findMany({
            where: { match_id: matchId },
            include: {
                referees: true,
            },
            orderBy: {
                submitted_at: 'asc',
            },
        });
    }

    //GET MATCHES FROM REFEREE
    async getRefereeMatches(refereeId: string){
        const referee = await this.prisma.referees.findUnique({
            where: { id: refereeId },
            select: { id: true },
        });

        if (!referee) {
            throw new NotFoundException('Arbitro no encontrado.');
        }

        return this.prisma.match_referees.findMany({
            where: { referee_id: refereeId},
            include: {
                matches: true,
            },
        });
    }


    //AVERAGE RATINGS
    async getAverageRating(refereeId: string){
        const referee = await this.prisma.referees.findUnique({
            where: { id: refereeId },
            select: { id: true },
        });

        if (!referee) {
            throw new NotFoundException('Arbitro no encontrado.');
        }

        return this.prisma.referee_ratings.aggregate({
            where: { referee_id: refereeId},
            _avg: { rating: true},
        });
    }

}
