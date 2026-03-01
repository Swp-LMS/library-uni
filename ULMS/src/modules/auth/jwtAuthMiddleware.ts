import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload as LibJwtPayload, Secret } from 'jsonwebtoken';
import { jwtConfig } from '@/config/jwt';
import { cacheManager } from '@/utils/cache';
import { UserRole } from '@/modules/users/enums/user.enum';
import { JwtUser } from './types/auth.types';

type AuthPayload = LibJwtPayload & {
  sub: number | string;
  role: string;
  jti: string;
};

export const jwtAuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized: Missing token' });
  }

  const token = header.slice(7).trim();

  try {
    const decoded = jwt.verify(token, jwtConfig.secret as Secret) as AuthPayload;

    if (!decoded?.sub || !decoded?.jti || !decoded?.role) {
      return res
        .status(401)
        .json({ success: false, message: 'Unauthorized: Invalid token payload' });
    }

    // ✅ CHECK TOKEN REVOKED (ĐÚNG KEY)
    const isRevoked = await cacheManager.get(`revoked:${decoded.jti}`);
    if (isRevoked) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Token revoked' });
    }

    const userId = Number(decoded.sub);

    const jwtUser: JwtUser = {
      id: userId,
      sub: userId,
      role: decoded.role as UserRole,
      jti: decoded.jti,
    };

    // attach to request
    // @ts-ignore
    req.user = jwtUser;

    console.log('JWT user in middleware =', jwtUser);

    return next();
  } catch (e) {
    console.error('jwtAuthMiddleware error:', e);
    return res
      .status(401)
      .json({ success: false, message: 'Unauthorized: Invalid or expired token' });
  }
};
