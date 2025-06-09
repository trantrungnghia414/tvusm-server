export class BookingStatsDto {
  totalBookings: number;
  confirmedBookings?: number;
  pendingBookings?: number;
  cancelledBookings?: number;
  completedBookings?: number;
}
