import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Equipment } from './entities/equipment.entity';
import { EquipmentController } from 'src/equipment/equipment.controller';
import { EquipmentService } from 'src/equipment/equipment.service';
import { EquipmentCategory } from 'src/equipment/entities/equipment-category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Equipment, EquipmentCategory])],
  controllers: [EquipmentController],
  providers: [EquipmentService],
  exports: [EquipmentService],
})
export class EquipmentModule {}
