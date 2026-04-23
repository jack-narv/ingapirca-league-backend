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

    @Post('password-hash')
    async hashPassword(@Body() body: { password: string }) {
        return this.authService.hashPassword(body.password);
    }

    @UseGuards(JwtAuthGuard)
    @Delete('account')
    async deleteAccount(@CurrentUser() user: { userId: string }) {
        return this.authService.deactivateAccount(user.userId);
    }

    @UseGuards(JwtAuthGuard)
    @Post('reset-password')
    async resetPassword(
        @CurrentUser() user: { userId: string },
        @Body() body: { currentPassword: string; newPassword: string },
    ) {
        return this.authService.resetPassword(
            user.userId,
            body.currentPassword,
            body.newPassword,
        );
    }
}
