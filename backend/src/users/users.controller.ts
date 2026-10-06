import { Body, Controller, Post } from '@nestjs/common';
import { UsersService } from './users.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateUserDto } from './dto/createUser.dto';

@ApiTags("Users")
@Controller('users')
export class UsersController {

    constructor(
        private readonly usersService: UsersService
    ) { }

    @ApiOperation({ summary: "Create User" })
    @Post("create")
    async create(@Body() data: CreateUserDto) {
        return await this.usersService.create(data);
    }
}
