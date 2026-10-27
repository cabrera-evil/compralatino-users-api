import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from '../strategies/jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
	const guard = new JwtAuthGuard();

	it('denies when no token was supplied (no user)', () => {
		expect(() =>
			guard.handleRequest(null, false, new Error('No auth token'), {} as any)
		).toThrow(UnauthorizedException);
	});

	it('denies an invalid token (strategy error)', () => {
		const err = new UnauthorizedException('USER_NOT_FOUND');
		expect(() => guard.handleRequest(err, false, null, {} as any)).toThrow(err);
	});

	it('allows a valid token and returns the user', () => {
		const user = { id: 1 };
		expect(guard.handleRequest(null, user, null, {} as any)).toBe(user);
	});
});

describe('JwtStrategy', () => {
	let prisma: any;
	let strategy: JwtStrategy;

	beforeEach(() => {
		process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
		prisma = { user: { findUnique: jest.fn() } };
		strategy = new JwtStrategy(prisma);
	});

	it('rejects a token whose user does not exist', async () => {
		prisma.user.findUnique.mockResolvedValue(null);
		await expect(
			strategy.validate({} as any, { id: 9 } as any)
		).rejects.toThrow(new UnauthorizedException('USER_NOT_FOUND'));
	});

	it('returns the user for a valid payload', async () => {
		const user = { id: 9 };
		prisma.user.findUnique.mockResolvedValue(user);
		await expect(strategy.validate({} as any, { id: 9 } as any)).resolves.toBe(
			user
		);
		expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 9 } });
	});

	it('extracts the token from the jwt cookie, then refreshToken, else null', () => {
		const extract = (JwtStrategy as any).extractJWTFromCookie;
		expect(extract({ cookies: { jwt: 'a', refreshToken: 'b' } })).toBe('a');
		expect(extract({ cookies: { refreshToken: 'b' } })).toBe('b');
		expect(extract({})).toBeNull();
	});
});
