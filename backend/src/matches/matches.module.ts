import { Module } from '@nestjs/common';
import { MatchesService } from './matches.service';
import { MatchesController } from './matches.controller';
import { JwtService } from '@nestjs/jwt';

@Module({
  controllers: [MatchesController],
  providers: [MatchesService, JwtService]
})
export class MatchesModule { }
