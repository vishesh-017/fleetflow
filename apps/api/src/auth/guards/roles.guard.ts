import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

const ROLE_HIERARCHY: Record<UserRole, number> = {
  ADMIN: 100,
  MANAGER: 80,
  DISPATCHER: 60,
  SAFETY_OFFICER: 60,
  FINANCE: 60,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const userRoleLevel = ROLE_HIERARCHY[user.role] || 0;
    const hasRole = requiredRoles.some((role) => {
      const requiredRoleLevel = ROLE_HIERARCHY[role] || 0;
      // ADMIN can access everything, others need exact match or lower hierarchy
      if (user.role === UserRole.ADMIN) {
        return true;
      }
      return user.role === role || userRoleLevel >= requiredRoleLevel;
    });

    if (!hasRole) {
      throw new ForbiddenException(`Insufficient permissions. Required roles: ${requiredRoles.join(', ')}`);
    }

    return true;
  }
}

