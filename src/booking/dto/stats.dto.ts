export class BookingStatsDto {
  totalBookings: number;
  todayBookings: number; // Số booking có ngày chơi là hôm nay (dựa trên field date)
  todayBookingsCreated: number; // Số booking được tạo hôm nay (dựa trên created_at)
  confirmedBookings?: number;
  pendingBookings?: number;
  cancelledBookings?: number;
  completedBookings?: number;
}
