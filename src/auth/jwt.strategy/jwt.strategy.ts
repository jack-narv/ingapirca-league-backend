import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class JwtStrategy  extends PassportStrategy(Strategy){
    constructor(private configService: ConfigService,
                private prisma: PrismaService
    ){
       const secret = configService.get<string>('JWT_SECRET');

       if(!secret){
        throw new Error('JWT_SECRET no está definida');
       }

       super({
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: secret,
       });
    }

    async validate(payload: any) {
        const userRoles = await this.prisma.user_roles.findMany({
            where: {user_id: payload.sub},
            include: {
                roles: true
            },
        });

        const roleAssignments = userRoles.map((ur) => ({
            role: ur.roles.name.trim().toUpperCase(),
            season_id: ur.season_id,
        }));
        const roles = Array.from(new Set(roleAssignments.map((assignment) => assignment.role)));

        return {
            userId: payload.sub,
            email: payload.email,
            roles,
            roleAssignments,
        }
    }   

}
