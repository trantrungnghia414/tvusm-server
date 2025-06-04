export class AvailabilitySlotDto {
  start_time: string;
  end_time: string;
  is_available: boolean;
  booking_id?: number;
}

export class DayAvailabilityDto {
  date: string;
  slots: AvailabilitySlotDto[];
}

export class CourtAvailabilityResponseDto {
  court_id: number;
  availability: DayAvailabilityDto[];
}
