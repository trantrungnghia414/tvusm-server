import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Maintenance,
  MaintenanceStatus,
  MaintenancePriority,
  MaintenanceType,
} from './entities/maintenance.entity';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';

@Injectable()
export class MaintenanceService {
  constructor(
    @InjectRepository(Maintenance)
    private maintenanceRepository: Repository<Maintenance>,
  ) {}

  async create(
    createMaintenanceDto: CreateMaintenanceDto,
    userId: number,
  ): Promise<Maintenance> {
    const maintenance = this.maintenanceRepository.create({
      ...createMaintenanceDto,
      created_by: userId,
    });

    return this.maintenanceRepository.save(maintenance);
  }

  async findAll(): Promise<Maintenance[]> {
    return this.maintenanceRepository.find({
      relations: ['venue', 'court', 'equipment', 'assigned_user', 'creator'],
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Maintenance> {
    const maintenance = await this.maintenanceRepository.findOne({
      where: { maintenance_id: id },
      relations: ['venue', 'court', 'equipment', 'assigned_user', 'creator'],
    });

    if (!maintenance) {
      throw new NotFoundException(`Maintenance with ID ${id} not found`);
    }

    return maintenance;
  }

  async update(
    id: number,
    updateMaintenanceDto: UpdateMaintenanceDto,
  ): Promise<Maintenance> {
    const maintenance = await this.findOne(id);

    Object.assign(maintenance, updateMaintenanceDto);

    return this.maintenanceRepository.save(maintenance);
  }

  async remove(id: number): Promise<void> {
    const maintenance = await this.findOne(id);
    await this.maintenanceRepository.remove(maintenance);
  }

  async getStats() {
    try {
      const allMaintenances = await this.maintenanceRepository.find();

      // Basic counts
      const totalMaintenances = allMaintenances.length;
      const scheduledCount = allMaintenances.filter(
        (m) => m.status === MaintenanceStatus.SCHEDULED,
      ).length;
      const inProgressCount = allMaintenances.filter(
        (m) => m.status === MaintenanceStatus.IN_PROGRESS,
      ).length;
      const completedCount = allMaintenances.filter(
        (m) => m.status === MaintenanceStatus.COMPLETED,
      ).length;

      // Overdue count (scheduled maintenances past their scheduled date)
      const now = new Date();
      const overdueCount = allMaintenances.filter(
        (m) =>
          m.status === MaintenanceStatus.SCHEDULED &&
          new Date(m.scheduled_date) < now,
      ).length;

      // High priority count
      const highPriorityCount = allMaintenances.filter(
        (m) =>
          m.priority === MaintenancePriority.HIGH ||
          m.priority === MaintenancePriority.CRITICAL,
      ).length;

      // Cost calculations
      const totalEstimatedCost = allMaintenances.reduce(
        (sum, m) => sum + (m.estimated_cost || 0),
        0,
      );
      const totalActualCost = allMaintenances.reduce(
        (sum, m) => sum + (m.actual_cost || 0),
        0,
      );

      // This month count
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonthCount = allMaintenances.filter(
        (m) => new Date(m.created_at) >= thisMonthStart,
      ).length;

      // Completion rate calculations
      const completedMaintenances = allMaintenances.filter(
        (m) => m.status === MaintenanceStatus.COMPLETED,
      );

      const completedOnTime = completedMaintenances.filter((m) => {
        if (!m.completed_date) return false;
        return new Date(m.completed_date) <= new Date(m.scheduled_date);
      }).length;

      const completedOnTimeRate =
        completedMaintenances.length > 0
          ? (completedOnTime / completedMaintenances.length) * 100
          : 0;

      // Preventive percentage
      const preventiveCount = allMaintenances.filter(
        (m) => m.type === MaintenanceType.PREVENTIVE,
      ).length;
      const preventivePercentage =
        totalMaintenances > 0 ? (preventiveCount / totalMaintenances) * 100 : 0;

      // Average completion time
      const completedWithDuration = completedMaintenances.filter(
        (m) => m.actual_duration,
      );
      const averageCompletionTime =
        completedWithDuration.length > 0
          ? completedWithDuration.reduce(
              (sum, m) => sum + (m.actual_duration || 0),
              0,
            ) / completedWithDuration.length
          : 0;

      return {
        total_maintenances: totalMaintenances,
        scheduled_count: scheduledCount,
        in_progress_count: inProgressCount,
        completed_count: completedCount,
        overdue_count: overdueCount,
        high_priority_count: highPriorityCount,
        total_estimated_cost: totalEstimatedCost,
        total_actual_cost: totalActualCost,
        average_completion_time: averageCompletionTime,
        this_month_count: thisMonthCount,
        completed_on_time_rate: completedOnTimeRate,
        preventive_percentage: preventivePercentage,
      };
    } catch (error) {
      console.error('Error getting maintenance stats:', error);
      return {
        total_maintenances: 0,
        scheduled_count: 0,
        in_progress_count: 0,
        completed_count: 0,
        overdue_count: 0,
        high_priority_count: 0,
        total_estimated_cost: 0,
        total_actual_cost: 0,
        average_completion_time: 0,
        this_month_count: 0,
        completed_on_time_rate: 0,
        preventive_percentage: 0,
      };
    }
  }
}
