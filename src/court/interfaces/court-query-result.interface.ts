export interface CourtQueryResult {
  court_id: number;
  name: string;
  code: string;
  hourly_rate: number;
  description: string | null;
  status: 'available' | 'booked' | 'maintenance';
  image: string | null;
  is_indoor: boolean;
  venue_id: number;
  type_id: number;
  created_at: Date;
  updated_at: Date;
  venue_name: string;
  type_name: string;
}

export interface CourtResponse {
  court_id: number;
  name: string;
  code: string;
  hourly_rate: number;
  description: string | null;
  status: 'available' | 'booked' | 'maintenance';
  image: string | null;
  is_indoor: boolean;
  created_at: Date;
  updated_at: Date;
  venue_id: number;
  type_id: number;
  venue_name: string;
  type_name: string;
}
