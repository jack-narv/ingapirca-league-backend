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

        const user = await this.prisma.users.create({
            data:{
                email,
                password_hash: passwordHash,
                full_name: fullName,
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

        const payload = {
            sub: user.id,
            email: user.email,
        };

        const accessToken = this.jwtService.sign(payload);

        return {
            accessToken,
        };
    }
}



