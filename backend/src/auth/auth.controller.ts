import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { UserLoginDto } from './dto/userLogin.dto';
import { AuthGuard } from '@nestjs/passport';
import { GenerateAccessTokenDto } from './dto/generateAccessToken.dto';

@ApiTags("Auth")
@Controller('auth')
export class AuthController {

    constructor(
        private readonly authService: AuthService
    ) { }

    @ApiOperation({ summary: "Login User" })
    @Post('login')
    async login(@Body() data: UserLoginDto) {
        return this.authService.login(data);
    }


    @ApiOperation({ summary: "Google Login" })
    @Get('google')
    @UseGuards(AuthGuard('google'))
    async googleLogin() {
        // The guard will redirect to Google
    }


    @ApiOperation({ summary: "Google Callback" })
    @Get('google/callback')
    @UseGuards(AuthGuard('google'))
    async googleCallback(
        @Req() req: any,
        @Res() res: any
    ) {
        const result = await this.authService.handleGoogleLogin(req.user);
        const frontendUrl = process.env.FRONTEND_URL;
        return res.redirect(
            `${frontendUrl}/login?access_token=${result.access_token}&refresh_token=${result.refresh_token}`
        );
    }


    @ApiOperation({ summary: "Refresh Token" })
    @Post('refresh')
    async refreshToken(
        @Body() data: GenerateAccessTokenDto
    ) {
        return this.authService.generateAccessTokenFromRefreshToken(data);
    }

}
