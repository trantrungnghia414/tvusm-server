import { Equipment } from '../entities/equipment.entity';

export interface EquipmentWithExtras
  extends Omit<Equipment, 'category' | 'venue' | 'user'> {
  category_name?: string | null;
  venue_name?: string | null;
  added_by_name?: string | null;
}
