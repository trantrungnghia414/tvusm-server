import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourtService } from './court.service';
import { CourtController } from './court.controller';
import { Court } from './entities/court.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Court])],
  controllers: [CourtController],
  providers: [CourtService],
  exports: [CourtService],
})
export class CourtModule {}
