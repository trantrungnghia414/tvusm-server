import { Request } from 'express';
export interface RequestWithUser extends Request {
  user: {
    user_id: number;
    username: string;
    email: string;
    role: string; // Thêm các thuộc tính khác của user nếu cần
  };
}
