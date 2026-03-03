import { Controller, Post, Body, UseGuards, Delete } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth/jwt-auth.guard';
import { CurrentUser } from './current-user/current-user.decorator';

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

    @Post('refresh')
    async refresh(@Body() body:{refreshToken: string}){
        return this.authService.refresh(body.refreshToken);
    }

    @UseGuards(JwtAuthGuard)
    @Delete('account')
    async deleteAccount(@CurrentUser() user: { userId: string }) {
        return this.authService.deactivateAccount(user.userId);
    }
}
