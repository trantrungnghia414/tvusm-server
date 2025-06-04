export class CourtResponse {
  court_id: number;
  name: string;
  code: string;
  description?: string;
  hourly_rate: number;
  status: string;
  image?: string;
  is_indoor: boolean;
  created_at: Date;
  updated_at?: Date;
  venue_id: number;
  type_id: number;
  venue_name?: string;
  type_name?: string;
  booking_count?: number;
}
