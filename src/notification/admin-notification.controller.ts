// server/src/notification/admin-notification.controller.ts
import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { NotificationType } from './entities/notification.entity';

@Controller('admin/notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'manager')
export class AdminNotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  // ✅ Lấy tất cả thông báo với filter cho admin
  @Get()
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
    @Query('type') type?: string,
    @Query('status') status?: 'read' | 'unread' | 'all',
  ) {
    console.log(`📊 Admin fetching all notifications`);
    console.log(
      `📊 Parameters: page=${page}, limit=${limit}, type=${type}, status=${status}`,
    );

    const result = await this.notificationService.findAllForAdmin(
      Number(page),
      Number(limit),
      type as NotificationType,
      status,
    );

    console.log(`📊 Admin found ${result.total} total notifications`);

    return {
      notifications: result.notifications,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  // ✅ Lấy thống kê tổng quan cho admin
  @Get('stats')
  async getOverallStats() {
    console.log(`📈 Getting overall notification stats for admin`);

    const stats = await this.notificationService.getAdminStats();

    console.log(`📊 Overall stats:`, stats);

    return stats;
  }

  // ✅ Gửi thông báo hệ thống cho tất cả users
  @Post('broadcast-all')
  async broadcastToAll(
    @Body() body: { title: string; message: string; type?: string },
  ) {
    console.log(`📢 Broadcasting notification to all users:`, body);

    const allUsers = await this.notificationService.getAllActiveUserIds();

    if (allUsers.length === 0) {
      return { message: 'Không có user nào để gửi thông báo' };
    }

    await this.notificationService.createSystemNotification(
      allUsers,
      body.title,
      body.message,
      body.type as NotificationType,
    );

    console.log(`📢 Broadcasted to ${allUsers.length} users`);

    return {
      message: `Đã gửi thông báo đến ${allUsers.length} người dùng`,
      userCount: allUsers.length,
    };
  }

  // ✅ Gửi thông báo hệ thống cho users cụ thể
  @Post('system')
  async sendSystemNotification(
    @Body()
    body: {
      user_ids: number[];
      title: string;
      message: string;
      type?: string;
    },
  ) {
    console.log(`📢 Sending system notification:`, body);

    await this.notificationService.createSystemNotification(
      body.user_ids,
      body.title,
      body.message,
      body.type as NotificationType,
    );

    return {
      message: `Đã gửi thông báo đến ${body.user_ids.length} người dùng`,
      userCount: body.user_ids.length,
    };
  }

  // ✅ Thêm method để admin có thể test tạo thông báo
  @Post('test')
  async createTestNotification(
    @Body() body: { user_id: number; title?: string; message?: string },
  ) {
    const title = body.title || 'Thông báo test từ admin';
    const message =
      body.message ||
      'Đây là thông báo test được tạo bởi admin để kiểm tra hệ thống.';

    await this.notificationService.createSystemNotification(
      [body.user_id],
      title,
      message,
      NotificationType.SYSTEM,
      { test: true, created_by: 'admin' },
    );

    return {
      message: `Đã tạo thông báo test cho user ${body.user_id}`,
      user_id: body.user_id,
    };
  }
}
