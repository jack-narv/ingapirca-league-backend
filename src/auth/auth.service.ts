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

    private getAccessSecret() {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error('JWT_SECRET no esta definida');
        }
        return secret;
    }

    private getRefreshSecret() {
        return process.env.JWT_REFRESH_SECRET || this.getAccessSecret();
    }

    private getAccessExpiresIn() {
        return process.env.JWT_ACCESS_EXPIRES_IN || '1d';
    }

    private getRefreshExpiresIn() {
        return process.env.JWT_REFRESH_EXPIRES_IN || '3650d';
    }

    private async issueTokens(userId: string, email: string, roles: string[]) {
        const basePayload = {
            sub: userId,
            email,
            roles,
        };

        const accessToken = await this.jwtService.signAsync(
            { ...basePayload, token_type: 'access' },
            {
                secret: this.getAccessSecret(),
                expiresIn: this.getAccessExpiresIn() as any,
            },
        );

        const refreshToken = await this.jwtService.signAsync(
            { ...basePayload, token_type: 'refresh' },
            {
                secret: this.getRefreshSecret(),
                expiresIn: this.getRefreshExpiresIn() as any,
            },
        );

        return { accessToken, refreshToken };
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

        const tokens = await this.issueTokens(
            user.id,
            user.email,
            roleNames,
        );

        return {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            user: {
                id: user.id,
                email: user.email,
                roles: roleNames,
            },
        };
    }

    async refresh(refreshToken: string){
        if(!refreshToken || refreshToken.trim().length === 0){
            throw new UnauthorizedException('Refresh token requerido');
        }

        let payload: any;
        try{
            payload = await this.jwtService.verifyAsync(
                refreshToken,
                { secret: this.getRefreshSecret() },
            );
        } catch (_) {
            throw new UnauthorizedException(
                'Refresh token invalido o expirado',
            );
        }

        if(payload?.token_type !== 'refresh'){
            throw new UnauthorizedException(
                'Refresh token invalido',
            );
        }

        const user = await this.prisma.users.findUnique({
            where: { id: payload.sub },
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

        const roleNames = user.user_roles.map(
            (ur) => ur.roles.name,
        );

        const tokens = await this.issueTokens(
            user.id,
            user.email,
            roleNames,
        );

        return {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            user: {
                id: user.id,
                email: user.email,
                roles: roleNames,
            },
        };
    }
}



