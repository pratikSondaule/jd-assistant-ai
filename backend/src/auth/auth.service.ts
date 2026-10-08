import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { JwtService } from '@nestjs/jwt';
import { UserLoginDto } from './dto/userLogin.dto';
import { authRefreshToken, users } from 'src/db/schema';
import { and, eq } from 'drizzle-orm';
import md5 from 'md5';
import { GenerateAccessTokenDto } from './dto/generateAccessToken.dto';
import { RegisterUserDto } from './dto/registerUser.dto';

@Injectable()
export class AuthService {

    constructor(
        @InjectDrizzle()
        private readonly db: NodePgDatabase,
        private readonly jwtService: JwtService,
    ) { }

    async generateTokens(user: { id: string; email: string; name: string; }) {
        const payload = {
            id: user.id,
            email: user.email,
            name: user.name,
        };

        const access_token = await this.jwtService.signAsync(payload, {
            secret: process.env.JWT_SECRET,
            expiresIn: '30d',
        });

        const refresh_token = await this.jwtService.signAsync(
            { sub: user.id, email: user.email },
            {
                secret: process.env.JWT_SECRET_REFRESH,
                expiresIn: '90d',
            },
        );

        const refreshTokenPayload = await this.jwtService.decode(refresh_token) as { exp?: number };

        await this.db.insert(authRefreshToken).values({
            userId: user.id,
            refreshToken: refresh_token,
            expiresAt: new Date((refreshTokenPayload?.exp ?? 0) * 1000),
        });

        return {
            access_token,
            refresh_token,
        };
    }


    async createUser(data: RegisterUserDto) {

        const [existingUser] = await this.db.select()
            .from(users)
            .where(eq(users.email, data?.email))

        if (existingUser) {
            throw new HttpException("User already exists", HttpStatus.CONFLICT);
        }

        try {

            const hashedPassword = md5(data?.password?.trim() || '');

            await this.db.insert(users).values({
                name: data.name,
                email: data.email,
                password: hashedPassword,
            })

            return {
                status: true,
                statusCode: HttpStatus.CREATED,
                message: "User created successfully"
            }

        } catch (error) {
            console.log(error)
            throw new HttpException("Internal server error", HttpStatus.INTERNAL_SERVER_ERROR)
        }

    }


    async login(data: UserLoginDto) {

        const [user] = await this.db.select()
            .from(users)
            .where(eq(users.email, data?.email))

        if (!user) {
            throw new HttpException("User not found", HttpStatus.NOT_FOUND)
        }

        if (md5(data.password) != user.password) {
            throw new HttpException("Invalid password", HttpStatus.UNAUTHORIZED);
        }

        const tokens = await this.generateTokens(user);

        return {
            status: true,
            statusCode: HttpStatus.OK,
            message: "Login successful",
            ...tokens,
        }
    }


    async handleGoogleLogin(googleUser: any) {

        let [user] = await this.db.select()
            .from(users)
            .where(
                eq(users.googleId, googleUser.googleId)
            )

        if (!user) {

            await this.db.insert(users).values({
                googleId: googleUser.googleId,
                email: googleUser.email,
                name: googleUser.name,
            }).returning();

        } else if (!user.googleId) {

            await this.db.update(users).set({
                googleId: googleUser.googleId,
            }).where(eq(users.id, user.id));

        }

        const tokens = await this.generateTokens(user);

        return {
            status: true,
            user,
            ...tokens,
        };
    }


    async generateAccessTokenFromRefreshToken(data: GenerateAccessTokenDto) {

        try {
            const payload = await this.jwtService.verifyAsync(data?.refresh_token, {
                secret: process.env.JWT_SECRET_REFRESH,
            });

            const userId = payload?.sub;

            console.log("PAYLOAD ", payload)

            if (!userId) {
                throw new HttpException("Invalid refresh token payload", HttpStatus.UNAUTHORIZED);
            }

            const [user] = await this.db.select()
                .from(users)
                .where(eq(users.id, userId));

            if (!user) {
                throw new HttpException("User not found", HttpStatus.NOT_FOUND);
            }

            const [storedRefreshToken] = await this.db.select()
                .from(authRefreshToken)
                .where(
                    and(
                        eq(authRefreshToken.userId, userId),
                        eq(authRefreshToken.refreshToken, data.refresh_token),
                    )
                );

            if (!storedRefreshToken) {
                throw new HttpException("Refresh token is invalid or revoked", HttpStatus.UNAUTHORIZED);
            }

            if (storedRefreshToken.expiresAt && new Date(storedRefreshToken.expiresAt) < new Date()) {
                throw new HttpException("Refresh token expired", HttpStatus.UNAUTHORIZED);
            }

            const access_token = await this.jwtService.signAsync(
                {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                },
                {
                    secret: process.env.JWT_SECRET,
                    expiresIn: '30d',
                },
            );

            return {
                status: true,
                data: { access_token },
                message: "Access token generated successfully",
            };

        } catch (error) {
            console.error(error);
            throw new HttpException("Invalid or expired refresh token", HttpStatus.UNAUTHORIZED);
        }
    }


    async getLogedInUser(request: any) {

        const userId = request?.user?.id

        try {
            const [user] = await this.db.select()
                .from(users)
                .where(eq(users.id, userId));

            return {
                status: true,
                statusCode: HttpStatus.OK,
                data: user,
                message: "User fetched successfully",
            }
        } catch (error) {
            console.log(error)
            throw new HttpException("Internal server error", HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }

}
