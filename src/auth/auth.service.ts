import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';


@Injectable()
export class AuthService {
    constructor(private prisma: PrismaService,
                private jwtService: JwtService
    ){

    }

    async register(email: string, password:string, fullName?:string){
        const existing = await this.prisma.users.findUnique({
            where: {email},
        });

        if(existing){
            throw new BadRequestException('Este correo ya está registrado');
        }

        const passwordHash = await bcrypt.hash(password, 12);

        //CREATE USER
        const user = await this.prisma.users.create({
            data:{
                email,
                password_hash: passwordHash,
                full_name: fullName,
                is_active: true,
            },
        });

        // Assign USER role (id = 4)
        await this.prisma.user_roles.create({
            data: {
            user_id: user.id,
            role_id: 4, // USER
            },
        });

        return {
            id: user.id,
            email: user.email,
        };
    }

    async login(email: string, password: string){
        const user = await this.prisma.users.findUnique({
            where : {email},
            include: {
                user_roles: {
                    include: {
                    roles: true,
                    },
                },
            },
        });

        if (!user || !user.is_active){
            throw new UnauthorizedException('Usuario inactivo');
        }

        const passwordValid = await bcrypt.compare(
            password,
            user.password_hash,
        );

        if(!passwordValid){
            throw new UnauthorizedException('Credenciales inválidas');
        }

        // Extract role names
        const roleNames = user.user_roles.map(
            (ur) => ur.roles.name
        );

        const payload = {
            sub: user.id,
            email: user.email,
            roles: roleNames,
        };

        const accessToken = this.jwtService.sign(payload);

        return {
            accessToken,
            user: {
                id: user.id,
                email: user.email,
                roles: roleNames,
            },
        };
    }
}



