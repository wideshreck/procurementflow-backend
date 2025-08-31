import {
  ForbiddenException,
  UnauthorizedException,
  ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const reflector = new Reflector();
  const guard = new RolesGuard(reflector);

  // basit yardımcı: handler/class metadata'sını taklit edelim
  function createContext(user: any, requiredRoles?: string[]): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => ({} as any),
      getClass: () => ({} as any),
      // @ts-ignore — test için yeterli
    } as ExecutionContext;
  }

  // Reflector'ı spy’layarak gerekli rolleri döndürmesini sağlarız
  function spyRequiredRoles(roles?: string[]) {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      // @ts-ignore
      .mockReturnValue(roles);
  }

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('allows when no roles are required', () => {
    spyRequiredRoles(undefined);
    const ctx = createContext({ id: 1, role: 'USER' });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('throws UnauthorizedException when user is missing', () => {
    spyRequiredRoles(['ADMIN']);
    const ctx = createContext(null);
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('throws ForbiddenException when user role is missing', () => {
    spyRequiredRoles(['ADMIN']);
    const ctx = createContext({ id: 1 });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when role is insufficient', () => {
    spyRequiredRoles(['ADMIN']);
    const ctx = createContext({ id: 1, role: 'USER' });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('allows when role is sufficient', () => {
    spyRequiredRoles(['ADMIN']);
    const ctx = createContext({ id: 1, role: 'ADMIN' });
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
