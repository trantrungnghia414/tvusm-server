import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EquipmentIssue } from './entities/equipment-issue.entity';
import { CreateEquipmentIssueDto } from './dto/create-equipment-issue.dto';

@Injectable()
export class EquipmentIssuesService {
  constructor(
    @InjectRepository(EquipmentIssue)
    private readonly issueRepo: Repository<EquipmentIssue>,
  ) {}

  async create(
    dto: CreateEquipmentIssueDto,
    reportedBy: number,
  ): Promise<EquipmentIssue> {
    const issue = this.issueRepo.create({
      ...dto,
      reported_by: reportedBy,
      status: 'reported',
      reported_at: new Date(),
    });
    return this.issueRepo.save(issue);
  }
}
