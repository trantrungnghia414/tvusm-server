// server/src/notification/notification.scheduler.ts
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Not, IsNull, Between } from 'typeorm';
import { Booking, BookingStatus } from '../booking/entities/booking.entity';
import { Event, EventStatus } from '../events/entities/event.entity';
import { NotificationService } from './notification.service';

// ✅ Interface cho kết quả query thống kê
interface NotificationStatsResult {
  total: string;
  read: string;
  unread: string;
}

// ✅ Interface cho participants query result
interface ParticipantResult {
  user_id: number;
}

@Injectable()
export class NotificationScheduler {
  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    private readonly notificationService: NotificationService,
  ) {}

  // Gửi reminder cho booking sắp diễn ra (mỗi giờ)
  @Cron(CronExpression.EVERY_HOUR)
  async sendBookingReminders() {
    console.log('🔔 Checking for booking reminders...');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDateString = tomorrow.toISOString().split('T')[0]; // ✅ Convert to string format

    try {
      // ✅ Chỉ lấy bookings có user_id và status confirmed
      const upcomingBookings = await this.bookingRepository.find({
        where: {
          booking_date: tomorrowDateString,
          status: BookingStatus.CONFIRMED, // ✅ Sử dụng enum thay vì string
          user_id: Not(IsNull()), // ✅ Chỉ lấy bookings có user_id
        },
      });

      console.log(`📅 Found ${upcomingBookings.length} bookings for tomorrow`);

      for (const booking of upcomingBookings) {
        // ✅ Double check user_id trước khi gửi notification
        if (booking.user_id) {
          try {
            await this.notificationService.createBookingNotification(
              booking.user_id,
              booking.booking_id,
              'reminder',
              booking.booking_code,
            );
          } catch (notificationError) {
            console.error(
              `❌ Error sending notification for booking ${booking.booking_code}:`,
              notificationError,
            );
          }
        }
      }

      if (upcomingBookings.length > 0) {
        console.log(`✅ Sent ${upcomingBookings.length} booking reminders`);
      }
    } catch (error) {
      console.error('❌ Error sending booking reminders:', error);
    }
  }

  // Gửi reminder cho event sắp diễn ra (hàng ngày lúc 9h sáng)
  @Cron('0 9 * * *')
  async sendEventReminders() {
    console.log('🎉 Checking for event reminders...');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // ✅ Tạo Date range cho ngày mai
    const startOfTomorrow = new Date(tomorrow);
    startOfTomorrow.setHours(0, 0, 0, 0);

    const endOfTomorrow = new Date(tomorrow);
    endOfTomorrow.setHours(23, 59, 59, 999);

    try {
      // ✅ Sử dụng Date range thay vì string comparison
      const upcomingEvents = await this.eventRepository.find({
        where: {
          start_date: Between(startOfTomorrow, endOfTomorrow),
          status: EventStatus.UPCOMING,
        },
      });

      console.log(`🎪 Found ${upcomingEvents.length} events for tomorrow`);

      for (const event of upcomingEvents) {
        try {
          // ✅ Tìm participants cho event này
          const participants = await this.eventRepository
            .createQueryBuilder('event')
            .leftJoin(
              'event_participants',
              'ep',
              'ep.event_id = event.event_id',
            )
            .where('event.event_id = :eventId', { eventId: event.event_id })
            .select('ep.user_id', 'user_id')
            .getRawMany<ParticipantResult>();

          // ✅ Filter out null/undefined user_ids
          const userIds = participants
            .map((p: ParticipantResult) => p.user_id)
            .filter((id): id is number => id !== null && id !== undefined);

          if (userIds.length > 0) {
            await this.notificationService.createEventNotification(
              userIds,
              event.event_id,
              'reminder',
              event.title,
            );
            console.log(
              `⏰ Sent reminder to ${userIds.length} participants for event "${event.title}"`,
            );
          }

          // Nếu là sự kiện công khai và không có participants, thông báo cho tất cả users
          if (event.is_public && userIds.length === 0) {
            const allUsers =
              await this.notificationService.getAllActiveUserIds();
            if (allUsers.length > 0) {
              await this.notificationService.createEventNotification(
                allUsers.slice(0, 100), // Limit để tránh spam
                event.event_id,
                'reminder',
                event.title,
              );
              console.log(
                `📢 Sent public event reminder to ${Math.min(allUsers.length, 100)} users for "${event.title}"`,
              );
            }
          }
        } catch (eventError) {
          console.error(
            `❌ Error processing event ${event.title}:`,
            eventError,
          );
        }
      }

      if (upcomingEvents.length > 0) {
        console.log(`✅ Sent reminders for ${upcomingEvents.length} events`);
      }
    } catch (error) {
      console.error('❌ Error sending event reminders:', error);
    }
  }

  // Xóa thông báo cũ (hàng tuần vào chủ nhật lúc 2h sáng)
  @Cron('0 2 * * 0')
  async cleanupOldNotifications() {
    console.log('🧹 Cleaning up old notifications...');

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    try {
      // ✅ Access repository properly với type safety
      const result = await this.notificationService[
        'notificationRepository'
      ].delete({
        created_at: LessThan(thirtyDaysAgo),
        is_read: true,
      });

      console.log(`🗑️ Deleted ${result.affected || 0} old read notifications`);
    } catch (error) {
      console.error('❌ Error cleaning up notifications:', error);
    }
  }

  // Thống kê hàng ngày (mỗi ngày lúc 8h sáng)
  @Cron('0 8 * * *')
  async dailyNotificationStats() {
    console.log('📊 Generating daily notification stats...');

    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // ✅ Type-safe query với proper interface
      const stats = await this.notificationService['notificationRepository']
        .createQueryBuilder('notification')
        .select('COUNT(*)', 'total')
        .addSelect('SUM(CASE WHEN is_read = true THEN 1 ELSE 0 END)', 'read')
        .addSelect('SUM(CASE WHEN is_read = false THEN 1 ELSE 0 END)', 'unread')
        .where('notification.created_at BETWEEN :start AND :end', {
          start: yesterday,
          end: today,
        })
        .getRawOne<NotificationStatsResult>();

      // ✅ Type-safe access với null checks
      if (stats) {
        const totalCount = parseInt(stats.total, 10) || 0;
        const readCount = parseInt(stats.read, 10) || 0;
        const unreadCount = parseInt(stats.unread, 10) || 0;

        console.log(
          `📈 Yesterday's stats: ${totalCount} total, ${readCount} read, ${unreadCount} unread`,
        );
      } else {
        console.log('📈 No notification stats available for yesterday');
      }
    } catch (error) {
      console.error('❌ Error generating daily stats:', error);
    }
  }

  // ✅ Thêm method để update event status (nếu cần thiết)
  @Cron('1 0 * * *') // Chạy mỗi ngày lúc 00:01
  async updateEventStatuses() {
    console.log('🔄 Updating event statuses...');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      // Cập nhật sự kiện "upcoming" thành "ongoing" khi ngày bắt đầu <= ngày hiện tại
      const upcomingToOngoing = await this.eventRepository.update(
        {
          status: EventStatus.UPCOMING,
          start_date: LessThan(today),
        },
        { status: EventStatus.ONGOING },
      );

      // Cập nhật sự kiện "ongoing" thành "completed" khi ngày kết thúc < ngày hiện tại
      const ongoingToCompleted = await this.eventRepository.update(
        {
          status: EventStatus.ONGOING,
          end_date: LessThan(today),
        },
        { status: EventStatus.COMPLETED },
      );

      console.log(
        `✅ Updated ${upcomingToOngoing.affected || 0} events to ongoing, ${ongoingToCompleted.affected || 0} events to completed`,
      );
    } catch (error) {
      console.error('❌ Error updating event statuses:', error);
    }
  }
}
