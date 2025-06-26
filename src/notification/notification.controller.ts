// server/src/notification/notification.controller.ts
import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface RequestWithUser extends Request {
  user?: {
    user_id: number;
    username: string;
    email: string;
    role: string;
    [key: string]: any;
  };
}

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  // ✅ Lấy thông báo của user hiện tại với phân trang
  @Get()
  async findByUser(
    @Request() req: RequestWithUser,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('type') type?: string,
    @Query('unread_only') unreadOnly: string = 'false',
  ) {
    const userId = req.user!.user_id;

    console.log(`🔔 Fetching notifications for user ${userId}`);
    console.log(
      `📊 Parameters: page=${page}, limit=${limit}, type=${type}, unreadOnly=${unreadOnly}`,
    );

    const result = await this.notificationService.findByUser(
      userId,
      Number(page),
      Number(limit),
      type as any,
      unreadOnly === 'true',
    );

    console.log(`📊 Found ${result.total} notifications for user ${userId}`);
    console.log(
      `📋 First few notifications:`,
      result.notifications.slice(0, 2),
    );

    // ✅ Đảm bảo response structure đúng
    return {
      notifications: result.notifications,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  // ✅ Lấy thống kê thông báo của user
  @Get('stats')
  async getStats(@Request() req: RequestWithUser) {
    const userId = req.user!.user_id;
    console.log(`📈 Getting notification stats for user ${userId}`);

    const stats = await this.notificationService.getStats(userId);
    console.log(`📊 User ${userId} stats:`, stats);

    return stats;
  }

  // ✅ Đánh dấu thông báo đã đọc
  @Patch('read')
  async markAsRead(
    @Body() body: { notification_ids: number[] },
    @Request() req: RequestWithUser,
  ) {
    const userId = req.user!.user_id;
    console.log(
      `✅ Marking notifications as read for user ${userId}:`,
      body.notification_ids,
    );

    await this.notificationService.markAsRead(body.notification_ids, userId);
    return { message: 'Đã đánh dấu thông báo là đã đọc' };
  }

  // ✅ Đánh dấu tất cả thông báo đã đọc
  @Patch('read-all')
  async markAllAsRead(@Request() req: RequestWithUser) {
    const userId = req.user!.user_id;
    console.log(`✅ Marking all notifications as read for user ${userId}`);

    await this.notificationService.markAllAsRead(userId);
    return { message: 'Đã đánh dấu tất cả thông báo là đã đọc' };
  }

  // ✅ Xóa thông báo
  @Delete()
  async remove(
    @Body() body: { notification_ids: number[] },
    @Request() req: RequestWithUser,
  ) {
    const userId = req.user!.user_id;
    console.log(
      `🗑️ Deleting notifications for user ${userId}:`,
      body.notification_ids,
    );

    await this.notificationService.remove(body.notification_ids, userId);
    return { message: 'Đã xóa thông báo' };
  }

  // ✅ Xóa tất cả thông báo đã đọc
  @Delete('read')
  async removeAllRead(@Request() req: RequestWithUser) {
    const userId = req.user!.user_id;
    console.log(`🗑️ Deleting all read notifications for user ${userId}`);

    await this.notificationService.removeAllRead(userId);
    return { message: 'Đã xóa tất cả thông báo đã đọc' };
  }

  // ✅ Lấy chi tiết một thông báo
  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: RequestWithUser,
  ) {
    const userId = req.user!.user_id;

    // Tìm thông báo và kiểm tra quyền
    const notifications = await this.notificationService.findByUser(
      userId,
      1,
      1000,
    );
    const notification = notifications.notifications.find(
      (n) => n.notification_id === id,
    );

    if (!notification) {
      throw new Error('Không tìm thấy thông báo');
    }

    return notification;
  }
}
