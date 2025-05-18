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
  BadRequestException,
} from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateCourtMappingDto } from 'src/court-mapping/dto/create-court-mapping.dto';
import { CourtMappingService } from 'src/court-mapping/court-mapping.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { UpdateCourtMappingDto } from 'src/court-mapping/dto/update-court-mapping.dto';

@Controller('court-mappings')
export class CourtMappingController {
  constructor(private readonly courtMappingService: CourtMappingService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.courtMappingService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.courtMappingService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager')
  create(@Body() createCourtMappingDto: CreateCourtMappingDto) {
    if (
      createCourtMappingDto.parent_court_id ===
      createCourtMappingDto.child_court_id
    ) {
      throw new BadRequestException(
        'Sân cha và sân con không thể là cùng một sân',
      );
    }
    return this.courtMappingService.create(createCourtMappingDto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCourtMappingDto: UpdateCourtMappingDto,
  ) {
    if (
      updateCourtMappingDto.parent_court_id &&
      updateCourtMappingDto.child_court_id &&
      updateCourtMappingDto.parent_court_id ===
        updateCourtMappingDto.child_court_id
    ) {
      throw new BadRequestException(
        'Sân cha và sân con không thể là cùng một sân',
      );
    }
    return this.courtMappingService.update(id, updateCourtMappingDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.courtMappingService.remove(id);
  }
}
