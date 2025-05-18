import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateCourtMappingDto {
  @IsNotEmpty({ message: 'Sân cha không được để trống' })
  @IsNumber({}, { message: 'ID sân cha phải là số' })
  parent_court_id: number;

  @IsNotEmpty({ message: 'Sân con không được để trống' })
  @IsNumber({}, { message: 'ID sân con phải là số' })
  child_court_id: number;

  @IsOptional()
  @IsString({ message: 'Vị trí phải là chuỗi' })
  position?: string | null;
}
