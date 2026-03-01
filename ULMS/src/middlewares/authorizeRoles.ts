import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@/modules/users/enums/user.enum';

/**
 * Middleware kiểm tra quyền truy cập theo vai trò (role)
 * @param roles Danh sách role được phép truy cập (ví dụ: ['admin', 'librarian'])
 */
export function authorizeRoles(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Bạn chưa đăng nhập',
      });
    }

    if (!roles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Bạn không có quyền truy cập tài nguyên này',
      });
    }

    next();
  };
}
