import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService){

    }

    @Post('register')
    async register(@Body() body: {email: string; password: string; fullName?:string},){
        
        return this.authService.register(
            body.email,
            body.password,
            body.fullName,
        );
    }

    @Post('login')
    async login(@Body() body:{email: string; password: string}){
        return this.authService.login(body.email, body.password);
    }
}
