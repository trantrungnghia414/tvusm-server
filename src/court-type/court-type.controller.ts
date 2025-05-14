import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
  ConflictException,
} from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CourtTypeService } from './court-type.service';
import { CreateCourtTypeDto } from './dto/create-court-type.dto';
import { UpdateCourtTypeDto } from './dto/update-court-type.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('court-types')
export class CourtTypeController {
  constructor(private readonly courtTypeService: CourtTypeService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager')
  create(@Body() createCourtTypeDto: CreateCourtTypeDto) {
    return this.courtTypeService.create(createCourtTypeDto);
  }

  @Get()
  findAll() {
    return this.courtTypeService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.courtTypeService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCourtTypeDto: UpdateCourtTypeDto,
  ) {
    return this.courtTypeService.update(id, updateCourtTypeDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async remove(@Param('id', ParseIntPipe) id: number) {
    const isInUse = await this.courtTypeService.isInUse(id);
    if (isInUse) {
      throw new ConflictException(
        'Không thể xóa loại sân này vì đang được sử dụng bởi một hoặc nhiều sân',
      );
    }
    return this.courtTypeService.remove(id);
  }

  @Get(':id/is-in-use')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  isInUse(@Param('id', ParseIntPipe) id: number) {
    return this.courtTypeService.isInUse(id);
  }
}
