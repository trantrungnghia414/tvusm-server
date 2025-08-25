import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { EquipmentIssuesService } from './equipment-issues.service';
import { CreateEquipmentIssueDto } from './dto/create-equipment-issue.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { User } from 'src/user/entities/user.entity';

@Controller('equipment-issues')
@UseGuards(JwtAuthGuard)
export class EquipmentIssuesController {
  constructor(private readonly issuesService: EquipmentIssuesService) {}

  @Post()
  async create(@Body() dto: CreateEquipmentIssueDto, @GetUser() user: User) {
    const created = await this.issuesService.create(dto, user.user_id);
    return created;
  }
}
