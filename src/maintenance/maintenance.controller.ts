import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

interface AuthenticatedRequest {
  user: {
    user_id: number;
    username: string;
    role: string;
  };
}

@Controller('maintenances')
@UseGuards(JwtAuthGuard)
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin', 'staff', 'technician')
  create(
    @Body() createMaintenanceDto: CreateMaintenanceDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.maintenanceService.create(
      createMaintenanceDto,
      req.user.user_id,
    );
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin', 'staff', 'technician')
  findAll() {
    return this.maintenanceService.findAll();
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles('admin', 'staff', 'technician')
  getStats() {
    return this.maintenanceService.getStats();
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'staff', 'technician')
  findOne(@Param('id') id: string) {
    return this.maintenanceService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'staff', 'technician')
  update(
    @Param('id') id: string,
    @Body() updateMaintenanceDto: UpdateMaintenanceDto,
  ) {
    return this.maintenanceService.update(+id, updateMaintenanceDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'staff')
  remove(@Param('id') id: string) {
    return this.maintenanceService.remove(+id);
  }
}
