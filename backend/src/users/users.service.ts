import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { CreateUserDto } from './dto/createUser.dto';
import { users } from 'src/db/schema';
import { eq } from 'drizzle-orm';
import md5 from 'md5';

@Injectable()
export class UsersService {

    constructor(
        @InjectDrizzle()
        private readonly db: NodePgDatabase
    ) { }

    async create(data: CreateUserDto) {

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
}
