import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EquipmentIssue } from './entities/equipment-issue.entity';
import { EquipmentIssuesService } from './equipment-issues.service';
import { EquipmentIssuesController } from './equipment-issues.controller';

@Module({
  imports: [TypeOrmModule.forFeature([EquipmentIssue])],
  controllers: [EquipmentIssuesController],
  providers: [EquipmentIssuesService],
})
export class EquipmentIssuesModule {}
