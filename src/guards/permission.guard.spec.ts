import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionGuard } from './permission.guard';

describe('PermissionGuard', () => {
	let prisma: any;
	let reflector: Reflector;
	let guard: PermissionGuard;

	const ctx = (user?: any) =>
		({
			getHandler: () => ({}),
			getClass: () => ({}),
			switchToHttp: () => ({ getRequest: () => ({ user }) }),
		}) as any;

	const dbUser = (...codes: string[]) => ({
		userRoles: [
			{
				role: {
					rolePermissions: codes.map((code) => ({ permission: { code } })),
				},
			},
		],
	});

	beforeEach(() => {
		prisma = { user: { findUnique: jest.fn() } };
		reflector = new Reflector();
		jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['users:read']);
		guard = new PermissionGuard(reflector, prisma);
	});

	it('allows when no permission is required', async () => {
		jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
		await expect(guard.canActivate(ctx())).resolves.toBe(true);
		expect(prisma.user.findUnique).not.toHaveBeenCalled();
	});

	it('denies when there is no authenticated user', async () => {
		await expect(guard.canActivate(ctx(undefined))).resolves.toBe(false);
	});

	it('denies when the user no longer exists', async () => {
		prisma.user.findUnique.mockResolvedValue(null);
		await expect(guard.canActivate(ctx({ id: 1 }))).resolves.toBe(false);
	});

	it('throws Forbidden when the permission is missing', async () => {
		prisma.user.findUnique.mockResolvedValue(dbUser('roles:read'));
		await expect(guard.canActivate(ctx({ id: 1 }))).rejects.toThrow(
			ForbiddenException
		);
	});

	it('allows when the user holds the permission', async () => {
		prisma.user.findUnique.mockResolvedValue(dbUser('users:read'));
		await expect(guard.canActivate(ctx({ id: 1 }))).resolves.toBe(true);
	});

	it('allows when any one of several required permissions is held', async () => {
		jest
			.spyOn(reflector, 'getAllAndOverride')
			.mockReturnValue(['users:read', 'users:update']);
		prisma.user.findUnique.mockResolvedValue(dbUser('users:update'));
		await expect(guard.canActivate(ctx({ id: 1 }))).resolves.toBe(true);
	});
});
