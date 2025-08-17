// server/src/notification/notification.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Between } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { User } from '../user/entities/user.entity';
import {
  CreateNotificationDto,
  BulkCreateNotificationDto,
} from './dto/create-notification.dto';

// ✅ Define interfaces for type safety
interface NotificationTypeResult {
  type: string;
  count: string;
}

interface NotificationDateResult {
  date: string;
  count: string;
}

interface MostActiveUserResult {
  user_id: number;
  username: string | null;
  notification_count: string;
}

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  // Tạo thông báo đơn
  async create(
    createNotificationDto: CreateNotificationDto,
  ): Promise<Notification> {
    const notification = this.notificationRepository.create(
      createNotificationDto,
    );
    return await this.notificationRepository.save(notification);
  }

  // Tạo thông báo hàng loạt
  async createBulk(
    bulkCreateDto: BulkCreateNotificationDto,
  ): Promise<Notification[]> {
    const { user_ids, ...notificationData } = bulkCreateDto;

    const notifications = user_ids.map((user_id) =>
      this.notificationRepository.create({
        ...notificationData,
        user_id,
      }),
    );

    return await this.notificationRepository.save(notifications);
  }

  // Lấy thông báo của user với phân trang
  async findByUser(
    userId: number,
    page: number = 1,
    limit: number = 20,
    type?: NotificationType,
    unreadOnly: boolean = false,
  ) {
    console.log(
      `🔍 Finding notifications for user ${userId}, page ${page}, limit ${limit}, type: ${type}, unreadOnly: ${unreadOnly}`,
    );

    const queryBuilder = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.user_id = :userId', { userId })
      .orderBy('notification.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (type) {
      queryBuilder.andWhere('notification.type = :type', { type });
    }

    if (unreadOnly) {
      queryBuilder.andWhere('notification.is_read = false');
    }

    // ✅ Debug: In ra SQL query
    console.log(`🔍 SQL Query:`, queryBuilder.getSql());
    console.log(`🔍 Parameters:`, { userId, type, unreadOnly });

    const [notifications, total] = await queryBuilder.getManyAndCount();

    console.log(
      `📊 Query result: ${notifications.length} notifications found, total: ${total}`,
    );

    // ✅ Debug: In ra một vài thông báo đầu tiên
    if (notifications.length > 0) {
      console.log(
        `📋 Sample notifications:`,
        notifications.slice(0, 3).map((n) => ({
          id: n.notification_id,
          title: n.title,
          message: n.message,
          is_read: n.is_read,
          created_at: n.created_at,
        })),
      );
    }

    return {
      notifications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Lấy thống kê thông báo
  async getStats(userId: number) {
    const [total, unread] = await Promise.all([
      this.notificationRepository.count({ where: { user_id: userId } }),
      this.notificationRepository.count({
        where: { user_id: userId, is_read: false },
      }),
    ]);

    return { total, unread };
  }

  // Đánh dấu đã đọc
  async markAsRead(notificationIds: number[], userId: number): Promise<void> {
    await this.notificationRepository.update(
      {
        notification_id: In(notificationIds),
        user_id: userId,
      },
      { is_read: true },
    );
  }

  // Đánh dấu tất cả đã đọc
  async markAllAsRead(userId: number): Promise<void> {
    await this.notificationRepository.update(
      { user_id: userId, is_read: false },
      { is_read: true },
    );
  }

  // Xóa thông báo
  async remove(notificationIds: number[], userId: number): Promise<void> {
    await this.notificationRepository.delete({
      notification_id: In(notificationIds),
      user_id: userId,
    });
  }

  // Xóa tất cả thông báo đã đọc
  async removeAllRead(userId: number): Promise<void> {
    await this.notificationRepository.delete({
      user_id: userId,
      is_read: true,
    });
  }

  // ===== SPECIALIZED NOTIFICATION METHODS =====

  // Tạo thông báo cho booking
  async createBookingNotification(
    userId: number,
    bookingId: number,
    type: 'created' | 'confirmed' | 'cancelled' | 'reminder',
    bookingCode: string,
  ) {
    const messages = {
      created: {
        title: '🎯 Đặt sân thành công',
        message: `Bạn đã đặt sân thành công với mã đặt sân ${bookingCode}. Vui lòng thanh toán để xác nhận.`,
        notificationType: NotificationType.BOOKING,
      },
      confirmed: {
        title: '✅ Đặt sân được xác nhận',
        message: `Đặt sân ${bookingCode} của bạn đã được xác nhận. Chúc bạn có trải nghiệm tuyệt vời!`,
        notificationType: NotificationType.BOOKING, // ✅ Sử dụng BOOKING thay vì SUCCESS
      },
      cancelled: {
        title: '❌ Đặt sân bị hủy',
        message: `Đặt sân ${bookingCode} của bạn đã bị hủy. Nếu có thắc mắc, vui lòng liên hệ hỗ trợ.`,
        notificationType: NotificationType.BOOKING, // ✅ Sử dụng BOOKING thay vì WARNING
      },
      reminder: {
        title: '⏰ Nhắc nhở đặt sân',
        message: `Bạn có lịch đặt sân ${bookingCode} sắp diễn ra. Vui lòng chuẩn bị sẵn sàng!`,
        notificationType: NotificationType.BOOKING, // ✅ Sử dụng BOOKING thay vì INFO
      },
    };

    const messageData = messages[type];

    return await this.create({
      user_id: userId,
      title: messageData.title,
      message: messageData.message,
      type: messageData.notificationType,
      reference_id: bookingId,
      data: {
        booking_code: bookingCode,
        action_type: type,
        link: `/bookings/${bookingId}`,
      },
    });
  }

  // Tạo thông báo cho payment
  async createPaymentNotification(
    userId: number,
    paymentId: number,
    type: 'success' | 'failed' | 'refund',
    amount: number,
    bookingCode: string,
  ) {
    const messages = {
      success: {
        title: '💳 Thanh toán thành công',
        message: `Thanh toán ${amount.toLocaleString('vi-VN')}đ cho đặt sân ${bookingCode} đã thành công.`,
        notificationType: NotificationType.PAYMENT, // ✅ Sử dụng PAYMENT thay vì SUCCESS
      },
      failed: {
        title: '❌ Thanh toán thất bại',
        message: `Thanh toán cho đặt sân ${bookingCode} thất bại. Vui lòng thử lại.`,
        notificationType: NotificationType.PAYMENT, // ✅ Sử dụng PAYMENT cho consistency
      },
      refund: {
        title: '💰 Hoàn tiền thành công',
        message: `Đã hoàn ${amount.toLocaleString('vi-VN')}đ cho đặt sân ${bookingCode} về tài khoản của bạn.`,
        notificationType: NotificationType.PAYMENT, // ✅ Sử dụng PAYMENT thay vì SUCCESS
      },
    };

    const messageData = messages[type];

    return await this.create({
      user_id: userId,
      title: messageData.title,
      message: messageData.message,
      type: messageData.notificationType,
      reference_id: paymentId,
      data: {
        booking_code: bookingCode,
        amount,
        action_type: type,
        link: `/payments/${paymentId}`,
      },
    });
  }

  // Tạo thông báo cho event
  async createEventNotification(
    userIds: number[],
    eventId: number,
    type: 'created' | 'updated' | 'cancelled' | 'reminder',
    eventTitle: string,
  ) {
    const messages = {
      created: {
        title: '🎉 Sự kiện mới',
        message: `Sự kiện "${eventTitle}" đã được tạo. Đăng ký ngay để không bỏ lỡ!`,
        notificationType: NotificationType.EVENT,
      },
      updated: {
        title: '📝 Cập nhật sự kiện',
        message: `Sự kiện "${eventTitle}" đã có thay đổi thông tin. Vui lòng kiểm tra lại.`,
        notificationType: NotificationType.EVENT, // ✅ Sử dụng EVENT thay vì INFO
      },
      cancelled: {
        title: '❌ Hủy sự kiện',
        message: `Sự kiện "${eventTitle}" đã bị hủy. Chúng tôi xin lỗi vì sự bất tiện này.`,
        notificationType: NotificationType.EVENT, // ✅ Sử dụng EVENT thay vì WARNING
      },
      reminder: {
        title: '⏰ Nhắc nhở sự kiện',
        message: `Sự kiện "${eventTitle}" sắp diễn ra. Đừng quên tham gia nhé!`,
        notificationType: NotificationType.EVENT, // ✅ Sử dụng EVENT thay vì INFO
      },
    };

    const messageData = messages[type];

    return await this.createBulk({
      user_ids: userIds,
      title: messageData.title,
      message: messageData.message,
      type: messageData.notificationType,
      reference_id: eventId,
      data: {
        event_title: eventTitle,
        action_type: type,
        link: `/events/${eventId}`,
      },
    });
  }

  // Tạo thông báo hệ thống
  async createSystemNotification(
    userIds: number[],
    title: string,
    message: string,
    type: NotificationType = NotificationType.SYSTEM,
    data?: Record<string, any>, // ✅ Better typing for data parameter
  ) {
    return await this.createBulk({
      user_ids: userIds,
      title,
      message,
      type,
      data,
    });
  }

  // Tạo thông báo bảo trì
  async createMaintenanceNotification(
    userIds: number[],
    maintenanceId: number,
    type: 'scheduled' | 'started' | 'completed',
    details: string,
  ) {
    const messages = {
      scheduled: {
        title: '🔧 Lịch bảo trì',
        message: `Đã lên lịch bảo trì: ${details}. Hệ thống có thể tạm ngưng hoạt động.`,
        notificationType: NotificationType.MAINTENANCE,
      },
      started: {
        title: '🛠️ Bắt đầu bảo trì',
        message: `Đang tiến hành bảo trì: ${details}. Một số chức năng có thể bị ảnh hưởng.`,
        notificationType: NotificationType.MAINTENANCE, // ✅ Sử dụng MAINTENANCE thay vì WARNING
      },
      completed: {
        title: '✅ Hoàn tất bảo trì',
        message: `Đã hoàn tất bảo trì: ${details}. Tất cả chức năng đã hoạt động bình thường.`,
        notificationType: NotificationType.MAINTENANCE, // ✅ Sử dụng MAINTENANCE thay vì SUCCESS
      },
    };

    const messageData = messages[type];

    return await this.createBulk({
      user_ids: userIds,
      title: messageData.title,
      message: messageData.message,
      type: messageData.notificationType,
      reference_id: maintenanceId,
      data: {
        maintenance_details: details,
        action_type: type,
        link: `/maintenance/${maintenanceId}`,
      },
    });
  }

  // ===== ADMIN STATS METHODS =====

  async getTotalNotificationsCount(): Promise<number> {
    return await this.notificationRepository.count();
  }

  async getTodayNotificationsCount(): Promise<number> {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    return await this.notificationRepository.count({
      where: {
        created_at: Between(startOfDay, endOfDay),
      },
    });
  }

  async getNotificationsByType(): Promise<Record<string, number>> {
    // ✅ Type-safe query with proper interface
    const result = await this.notificationRepository
      .createQueryBuilder('notification')
      .select('notification.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('notification.type')
      .getRawMany<NotificationTypeResult>();

    const stats: Record<string, number> = {
      booking: 0,
      payment: 0,
      event: 0,
      system: 0,
      maintenance: 0,
      success: 0,
      warning: 0,
      error: 0,
      info: 0,
    };

    // ✅ Type-safe iteration
    result.forEach((item: NotificationTypeResult) => {
      stats[item.type] = parseInt(item.count, 10);
    });

    return stats;
  }

  async getNotificationsByDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<Array<{ date: string; count: number }>> {
    // ✅ Type-safe query with proper interface
    const result = await this.notificationRepository
      .createQueryBuilder('notification')
      .select('DATE(notification.created_at)', 'date')
      .addSelect('COUNT(*)', 'count')
      .where('notification.created_at BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .groupBy('DATE(notification.created_at)')
      .orderBy('date', 'ASC')
      .getRawMany<NotificationDateResult>();

    // ✅ Type-safe mapping
    return result.map((item: NotificationDateResult) => ({
      date: item.date,
      count: parseInt(item.count, 10),
    }));
  }

  async getMostActiveUsers(): Promise<
    Array<{ user_id: number; username: string; notification_count: number }>
  > {
    // ✅ Type-safe query with proper interface
    const result = await this.notificationRepository
      .createQueryBuilder('notification')
      .leftJoin('notification.user', 'user')
      .select('notification.user_id', 'user_id')
      .addSelect('user.username', 'username')
      .addSelect('COUNT(*)', 'notification_count')
      .groupBy('notification.user_id')
      .addGroupBy('user.username')
      .orderBy('notification_count', 'DESC')
      .limit(10)
      .getRawMany<MostActiveUserResult>();

    // ✅ Type-safe mapping with proper null handling
    return result.map((item: MostActiveUserResult) => ({
      user_id: item.user_id,
      username: item.username || `User ${item.user_id}`,
      notification_count: parseInt(item.notification_count, 10),
    }));
  }

  async getAllActiveUserIds(): Promise<number[]> {
    const users = await this.userRepository.find({
      where: { status: 'active' },
      select: ['user_id'],
    });

    return users.map((user) => user.user_id);
  }

  async findAllForAdmin(
    page: number = 1,
    limit: number = 50,
    type?: NotificationType,
    statusFilter?: 'read' | 'unread' | 'all',
  ) {
    console.log(
      `🔍 [Admin] Finding all notifications, page ${page}, limit ${limit}, type: ${type}, status: ${statusFilter}`,
    );

    const queryBuilder = this.notificationRepository
      .createQueryBuilder('notification')
      .leftJoinAndSelect('notification.user', 'user')
      .select([
        'notification',
        'user.user_id',
        'user.username',
        'user.email',
        'user.fullname',
      ])
      .orderBy('notification.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (type) {
      queryBuilder.andWhere('notification.type = :type', { type });
    }

    if (statusFilter === 'read') {
      queryBuilder.andWhere('notification.is_read = true');
    } else if (statusFilter === 'unread') {
      queryBuilder.andWhere('notification.is_read = false');
    }

    // ✅ Debug: In ra SQL query
    console.log(`🔍 [Admin] SQL Query:`, queryBuilder.getSql());

    const [notifications, total] = await queryBuilder.getManyAndCount();

    console.log(
      `📊 [Admin] Query result: ${notifications.length} notifications found, total: ${total}`,
    );

    return {
      notifications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Thêm method để lấy admin stats
  async getAdminStats() {
    const [total, unread, today] = await Promise.all([
      this.notificationRepository.count(),
      this.notificationRepository.count({ where: { is_read: false } }),
      this.getTodayNotificationsCount(),
    ]);

    const byType = await this.getNotificationsByType();
    const mostActiveUsers = await this.getMostActiveUsers();

    return {
      total,
      unread,
      read: total - unread,
      today,
      byType,
      mostActiveUsers,
    };
  }
}
