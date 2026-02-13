import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector){}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [
        context.getHandler(),
        context.getClass(),
      ],
    );

    if(!requiredRoles || requiredRoles.length === 0){
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if(!user || !user.roles){
      return false;
    }

    return requiredRoles.some((role) =>
      user.roles.includes(role),
    );

  }
}
