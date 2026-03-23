import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class RolesGuard implements CanActivate {
  private static readonly SCOPED_ROLES = ['LEAGUE_ADMIN', 'VOCAL'];

  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    return this.canActivateInternal(context);
  }

  private async canActivateInternal(
    context: ExecutionContext,
  ): Promise<boolean> {
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

    const matchedRoles = requiredRoles.filter((role) => user.roles.includes(role));
    if (matchedRoles.length === 0) {
      return false;
    }

    if (matchedRoles.includes('ADMIN')) {
      return true;
    }

    const matchedScopedRoles = matchedRoles.filter((role) =>
      RolesGuard.SCOPED_ROLES.includes(role),
    );
    const matchedScopedRoleIds = this.toRoleIds(matchedScopedRoles);

    if (matchedScopedRoles.length === 0) {
      return true;
    }

    const seasonScope = await this.resolveRequestSeasonScope(request);
    const leagueScope =
      this.readString(request?.body, 'league_id') ??
      this.readString(request?.params, 'leagueId') ??
      this.readString(request?.query, 'league_id') ??
      this.readString(request?.query, 'leagueId');

    if (!seasonScope && leagueScope) {
      const hasLeagueScopedAssignment = await this.prisma.user_roles.findFirst({
        where: {
          user_id: user.userId,
          role_id: {
            in: matchedScopedRoleIds,
          },
          seasons: {
            is: {
              league_id: leagueScope,
            },
          },
        },
      });

      if (!hasLeagueScopedAssignment) {
        throw new ForbiddenException(
          'No tienes permisos para esta liga.',
        );
      }
      return true;
    }

    if (!seasonScope) {
      throw new ForbiddenException(
        'Rol con alcance por temporada: no se pudo determinar season_id para esta operacion.',
      );
    }

    const hasScopedAssignment = await this.prisma.user_roles.findFirst({
      where: {
        user_id: user.userId,
        season_id: seasonScope,
        role_id: {
          in: matchedScopedRoleIds,
        },
      },
    });

    if (!hasScopedAssignment) {
      throw new ForbiddenException(
        'No tienes permisos para esta temporada.',
      );
    }

    return true;
  }

  private async resolveRequestSeasonScope(request: any): Promise<string | null> {
    const directSeasonId =
      this.readString(request?.params, 'seasonId') ??
      this.readString(request?.params, 'season_id') ??
      this.readString(request?.body, 'season_id') ??
      this.readString(request?.query, 'season_id') ??
      this.readString(request?.query, 'seasonId') ??
      this.readHeaderSeasonId(request);

    let derivedSeasonId: string | null = null;

    const matchId =
      this.readString(request?.body, 'match_id') ??
      this.readString(request?.params, 'matchId');
    if (matchId) {
      derivedSeasonId = await this.getSeasonFromMatch(matchId);
    }

    const teamId =
      this.readString(request?.body, 'team_id') ??
      this.readString(request?.params, 'teamId');
    if (!derivedSeasonId && teamId) {
      derivedSeasonId = await this.getSeasonFromTeam(teamId);
    }

    const refereeId =
      this.readString(request?.body, 'referee_id') ??
      this.readString(request?.params, 'refereeId');
    if (!derivedSeasonId && refereeId) {
      derivedSeasonId = await this.getSeasonFromReferee(refereeId);
    }

    const teamPlayerId = this.readString(request?.params, 'teamPlayerId');
    if (!derivedSeasonId && teamPlayerId) {
      derivedSeasonId = await this.getSeasonFromTeamPlayer(teamPlayerId);
    }

    const genericId = this.readString(request?.params, 'id');
    const baseUrl = String(request?.baseUrl ?? '');
    const routePath = String(request?.route?.path ?? '');
    if (!derivedSeasonId && genericId) {
      if (baseUrl.includes('/matches')) {
        derivedSeasonId = await this.getSeasonFromMatch(genericId);
      } else if (baseUrl.includes('/match-events')) {
        derivedSeasonId = await this.getSeasonFromMatchEvent(genericId);
      } else if (baseUrl.includes('/referees') && routePath.includes(':id/deactivate')) {
        derivedSeasonId = await this.getSeasonFromReferee(genericId);
      } else if (
        baseUrl.includes('/referees') &&
        routePath.includes('match-referees/:id/observation')
      ) {
        derivedSeasonId = await this.getSeasonFromMatchReferee(genericId);
      } else if (baseUrl.includes('/venues')) {
        derivedSeasonId = await this.getSeasonFromVenue(genericId);
      }
    }

    if (directSeasonId && derivedSeasonId && directSeasonId !== derivedSeasonId) {
      throw new ForbiddenException('season_id no coincide con el recurso objetivo.');
    }

    return directSeasonId ?? derivedSeasonId;
  }

  private readString(source: any, key: string): string | null {
    if (!source || typeof source !== 'object') {
      return null;
    }
    const value = source[key];
    return typeof value === 'string' && value.trim().length > 0
      ? value.trim()
      : null;
  }

  private toRoleIds(roleNames: string[]): number[] {
    const ids: number[] = [];
    for (const roleName of roleNames) {
      const role = roleName.trim().toUpperCase();
      if (role === 'LEAGUE_ADMIN') ids.push(2);
      if (role === 'VOCAL') ids.push(5);
    }
    return Array.from(new Set(ids));
  }

  private readHeaderSeasonId(request: any): string | null {
    const rawHeader = request?.headers?.['x-season-id'];
    if (Array.isArray(rawHeader)) {
      return rawHeader.length > 0 ? String(rawHeader[0]) : null;
    }
    return typeof rawHeader === 'string' && rawHeader.trim().length > 0
      ? rawHeader.trim()
      : null;
  }

  private async getSeasonFromMatch(matchId: string): Promise<string | null> {
    const match = await this.prisma.matches.findUnique({
      where: { id: matchId },
      select: { season_id: true },
    });
    return match?.season_id ?? null;
  }

  private async getSeasonFromTeam(teamId: string): Promise<string | null> {
    const team = await this.prisma.teams.findUnique({
      where: { id: teamId },
      select: { season_id: true },
    });
    return team?.season_id ?? null;
  }

  private async getSeasonFromReferee(refereeId: string): Promise<string | null> {
    const referee = await this.prisma.referees.findUnique({
      where: { id: refereeId },
      select: { season_id: true },
    });
    return referee?.season_id ?? null;
  }

  private async getSeasonFromTeamPlayer(teamPlayerId: string): Promise<string | null> {
    const teamPlayer = await this.prisma.team_player.findUnique({
      where: { id: teamPlayerId },
      select: {
        teams: {
          select: {
            season_id: true,
          },
        },
      },
    });
    return teamPlayer?.teams?.season_id ?? null;
  }

  private async getSeasonFromMatchEvent(matchEventId: string): Promise<string | null> {
    const matchEvent = await this.prisma.match_events.findUnique({
      where: { id: matchEventId },
      select: {
        matches: {
          select: {
            season_id: true,
          },
        },
      },
    });
    return matchEvent?.matches?.season_id ?? null;
  }

  private async getSeasonFromMatchReferee(matchRefereeId: string): Promise<string | null> {
    const matchReferee = await this.prisma.match_referees.findUnique({
      where: { id: matchRefereeId },
      select: {
        matches: {
          select: {
            season_id: true,
          },
        },
      },
    });
    return matchReferee?.matches?.season_id ?? null;
  }

  private async getSeasonFromVenue(venueId: string): Promise<string | null> {
    const seasonVenueLinks = await this.prisma.season_venues.findMany({
      where: { venue_id: venueId },
      select: { season_id: true },
      distinct: ['season_id'],
    });

    if (seasonVenueLinks.length === 1) {
      return seasonVenueLinks[0].season_id;
    }
    return null;
  }
}
