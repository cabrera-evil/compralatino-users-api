import {
	ConflictException,
	NotFoundException,
	UnauthorizedException,
} from '@nestjs/common';
import * as bcryptjs from 'bcryptjs';
import { AuthService } from './auth.service';

jest.mock('bcryptjs', () => ({ compare: jest.fn(), hash: jest.fn() }));

describe('AuthService', () => {
	let prisma: any;
	let jwt: any;
	let mailer: any;
	let events: any;
	let service: AuthService;
	const compare = bcryptjs.compare as unknown as jest.Mock;

	beforeEach(() => {
		jest.clearAllMocks();
		prisma = {
			user: {
				findFirst: jest.fn(),
				findUnique: jest.fn(),
				update: jest.fn(),
			},
			userRole: { findMany: jest.fn().mockResolvedValue([]) },
			resetPassword: { findUnique: jest.fn(), upsert: jest.fn() },
		};
		jwt = { sign: jest.fn().mockReturnValue('tok'), verify: jest.fn() };
		mailer = { sendMail: jest.fn() };
		events = { publishUserRegistered: jest.fn() };
		service = new AuthService(prisma, jwt, mailer, events);
	});

	describe('validateUser', () => {
		it('returns null for an unknown identifier', async () => {
			prisma.user.findFirst.mockResolvedValue(null);
			await expect(service.validateUser('x', 'pw')).resolves.toBeNull();
			expect(compare).not.toHaveBeenCalled();
		});

		it('returns null for a wrong password', async () => {
			prisma.user.findFirst.mockResolvedValue({ id: 1, password: 'h' });
			compare.mockResolvedValue(false);
			await expect(service.validateUser('x', 'bad')).resolves.toBeNull();
		});

		it('returns the user for valid credentials', async () => {
			const user = { id: 1, password: 'h' };
			prisma.user.findFirst.mockResolvedValue(user);
			compare.mockResolvedValue(true);
			await expect(service.validateUser('x', 'ok')).resolves.toBe(user);
		});
	});

	describe('getAccess', () => {
		it('dedupes roles/permissions and picks the highest mapped role', async () => {
			prisma.userRole.findMany.mockResolvedValue([
				{
					role: {
						name: 'admin',
						rolePermissions: [{ permission: { code: 'a' } }],
					},
				},
				{
					role: {
						name: 'admin',
						rolePermissions: [{ permission: { code: 'a' } }],
					},
				},
			]);
			const access = await service.getAccess(1);
			expect(access.roles).toEqual(['admin']);
			expect(access.permissions).toEqual(['a']);
		});
	});

	describe('login / logout / profile', () => {
		it('login throws NotFound for a missing user', async () => {
			prisma.user.findUnique.mockResolvedValue(null);
			await expect(service.login(1, {} as any)).rejects.toThrow(
				NotFoundException
			);
		});

		it('login sets cookies and returns tokens', async () => {
			prisma.user.findUnique.mockResolvedValue({
				id: 1,
				password: 'secret',
			});
			const res: any = { cookie: jest.fn() };
			const out: any = await service.login(1, res);
			expect(res.cookie).toHaveBeenCalledTimes(2);
			expect(out.data.jwt).toBe('tok');
			expect(out.data.user.password).toBeUndefined();
		});

		it('logout throws NotFound for a missing user and clears cookies otherwise', async () => {
			prisma.user.findUnique.mockResolvedValueOnce(null);
			await expect(service.logout(1, {} as any)).rejects.toThrow(
				NotFoundException
			);
			prisma.user.findUnique.mockResolvedValueOnce({ id: 1 });
			const res: any = { clearCookie: jest.fn() };
			await service.logout(1, res);
			expect(res.clearCookie).toHaveBeenCalledTimes(2);
		});

		it('profile throws NotFound for a missing user', async () => {
			prisma.user.findUnique.mockResolvedValue(null);
			await expect(service.profile(1)).rejects.toThrow(NotFoundException);
		});
	});

	describe('refreshToken', () => {
		it('rejects an invalid token', async () => {
			jwt.verify.mockImplementation(() => {
				throw new Error('jwt malformed');
			});
			await expect(service.refreshToken('bad', {} as any)).rejects.toThrow(
				new UnauthorizedException('INVALID_REFRESH_TOKEN')
			);
		});

		it('rejects a valid token whose user is gone', async () => {
			jwt.verify.mockReturnValue({ id: 1 });
			prisma.user.findUnique.mockResolvedValue(null);
			await expect(service.refreshToken('t', {} as any)).rejects.toThrow(
				UnauthorizedException
			);
		});

		it('issues new tokens for a valid token', async () => {
			jwt.verify.mockReturnValue({ id: 1 });
			prisma.user.findUnique.mockResolvedValue({ id: 1 });
			const out: any = await service.refreshToken('t', {
				cookie: jest.fn(),
			} as any);
			expect(out.data.refreshToken).toBe('tok');
		});
	});

	describe('register', () => {
		it('throws Conflict after exhausting username retries', async () => {
			const { Prisma } = jest.requireActual('prisma/generated/client');
			const err = new Prisma.PrismaClientKnownRequestError('dup', {
				code: 'P2002',
				clientVersion: 'x',
				meta: { target: ['username'] },
			});
			prisma.user.findMany = jest.fn().mockResolvedValue([]);
			prisma.user.create = jest.fn().mockRejectedValue(err);
			(bcryptjs.hash as unknown as jest.Mock).mockResolvedValue('h');
			await expect(
				service.register(
					{
						name: 'Jane Doe',
						email: 'jane@x.com',
						password: 'pw',
					} as any,
					{} as any
				)
			).rejects.toThrow(new ConflictException('USERNAME_UNAVAILABLE'));
			expect(prisma.user.create).toHaveBeenCalledTimes(5);
			expect(events.publishUserRegistered).not.toHaveBeenCalled();
		});

		it('rethrows non-conflict errors without retrying', async () => {
			prisma.user.create = jest.fn().mockRejectedValue(new Error('boom'));
			(bcryptjs.hash as unknown as jest.Mock).mockResolvedValue('h');
			await expect(
				service.register(
					{
						email: 'a@x.com',
						password: 'p',
						username: 'u',
						firstName: 'f',
						lastName: 'l',
					} as any,
					{} as any
				)
			).rejects.toThrow('boom');
			expect(prisma.user.create).toHaveBeenCalledTimes(1);
		});
	});

	describe('password reset', () => {
		it('requestResetToken: NotFound for unknown email', async () => {
			prisma.user.findUnique.mockResolvedValue(null);
			await expect(
				service.requestResetToken({ email: 'x@x.com' } as any)
			).rejects.toThrow(NotFoundException);
		});

		it('requestResetToken: rejects non-local providers', async () => {
			prisma.user.findUnique.mockResolvedValue({ id: 1, provider: 'GOOGLE' });
			await expect(
				service.requestResetToken({ email: 'x@x.com' } as any)
			).rejects.toThrow(new UnauthorizedException('PROVIDER_NOT_LOCAL'));
			expect(mailer.sendMail).not.toHaveBeenCalled();
		});

		it('requestResetToken: stores a token and sends mail for local users', async () => {
			prisma.user.findUnique.mockResolvedValue({
				id: 1,
				provider: 'LOCAL',
				firstName: 'A',
				lastName: 'B',
			});
			await service.requestResetToken({ email: 'x@x.com' } as any);
			expect(prisma.resetPassword.upsert).toHaveBeenCalled();
			expect(mailer.sendMail).toHaveBeenCalled();
		});

		it('verifyResetToken: NotFound and expired cases, success otherwise', async () => {
			prisma.resetPassword.findUnique.mockResolvedValueOnce(null);
			await expect(
				service.verifyResetToken({ token: 't' } as any)
			).rejects.toThrow(NotFoundException);
			prisma.resetPassword.findUnique.mockResolvedValueOnce({
				expiresAt: new Date(Date.now() - 1000),
			});
			await expect(
				service.verifyResetToken({ token: 't' } as any)
			).rejects.toThrow(
				new UnauthorizedException('RESET_PASSWORD_TOKEN_EXPIRED')
			);
			prisma.resetPassword.findUnique.mockResolvedValueOnce({
				expiresAt: new Date(Date.now() + 60000),
			});
			await expect(
				service.verifyResetToken({ token: 't' } as any)
			).resolves.toEqual({ data: { message: 'Reset token is valid.' } });
		});

		it('resetPassword: rejects an expired token without updating the user', async () => {
			prisma.resetPassword.findUnique.mockResolvedValue({
				expiresAt: new Date(Date.now() - 1000),
			});
			await expect(
				service.resetPassword({ token: 't', password: 'p' } as any)
			).rejects.toThrow(UnauthorizedException);
			expect(prisma.user.update).not.toHaveBeenCalled();
		});
	});

	describe('changePassword', () => {
		const dto: any = {
			currentPassword: 'old',
			password: 'new',
			confirmPassword: 'new',
		};

		it('NotFound for a missing user', async () => {
			prisma.user.findUnique.mockResolvedValue(null);
			await expect(service.changePassword(1, dto)).rejects.toThrow(
				NotFoundException
			);
		});

		it('rejects non-local providers', async () => {
			prisma.user.findUnique.mockResolvedValue({ provider: 'GOOGLE' });
			await expect(service.changePassword(1, dto)).rejects.toThrow(
				new UnauthorizedException('PROVIDER_NOT_LOCAL')
			);
		});

		it('rejects a wrong current password', async () => {
			prisma.user.findUnique.mockResolvedValue({
				provider: 'LOCAL',
				password: 'h',
			});
			compare.mockResolvedValue(false);
			await expect(service.changePassword(1, dto)).rejects.toThrow(
				new UnauthorizedException('INVALID_CURRENT_PASSWORD')
			);
			expect(prisma.user.update).not.toHaveBeenCalled();
		});

		it('rejects mismatched confirmation', async () => {
			prisma.user.findUnique.mockResolvedValue({
				provider: 'LOCAL',
				password: 'h',
			});
			compare.mockResolvedValue(true);
			await expect(
				service.changePassword(1, { ...dto, confirmPassword: 'other' })
			).rejects.toThrow(new UnauthorizedException('PASSWORDS_DO_NOT_MATCH'));
		});

		it('updates the password on success', async () => {
			prisma.user.findUnique.mockResolvedValue({
				provider: 'LOCAL',
				password: 'h',
			});
			compare.mockResolvedValue(true);
			(bcryptjs.hash as unknown as jest.Mock).mockResolvedValue('newhash');
			await service.changePassword(1, dto);
			expect(prisma.user.update).toHaveBeenCalledWith({
				where: { id: 1 },
				data: { password: 'newhash' },
			});
		});
	});
});
