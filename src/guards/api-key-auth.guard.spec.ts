import { API_KEY_AUTH_ENABLED } from '@/decorators/api-key-auth.decorator';
import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiKeyAuthGuard } from './api-key-auth.guard';

describe('ApiKeyAuthGuard', () => {
	let apiKeyService: any;
	let reflector: Reflector;
	let guard: ApiKeyAuthGuard;

	const ctx = (headers: Record<string, any> = {}) => {
		const request: any = { headers };
		return {
			request,
			context: {
				getHandler: () => ({}),
				getClass: () => ({}),
				switchToHttp: () => ({ getRequest: () => request }),
			} as any,
		};
	};

	beforeEach(() => {
		apiKeyService = {
			validateKey: jest.fn(),
			updateLastUsed: jest.fn().mockResolvedValue(undefined),
		};
		reflector = new Reflector();
		jest
			.spyOn(reflector, 'getAllAndOverride')
			.mockImplementation((key) =>
				key === API_KEY_AUTH_ENABLED ? true : undefined
			);
		guard = new ApiKeyAuthGuard(apiKeyService, reflector);
	});

	it('skips the check when @ApiKeyAuth is not present', async () => {
		jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
		await expect(guard.canActivate(ctx().context)).resolves.toBe(true);
		expect(apiKeyService.validateKey).not.toHaveBeenCalled();
	});

	it('denies a missing key', async () => {
		await expect(guard.canActivate(ctx().context)).rejects.toThrow(
			new UnauthorizedException('Missing API key')
		);
	});

	it('denies an invalid key', async () => {
		apiKeyService.validateKey.mockResolvedValue(null);
		await expect(
			guard.canActivate(ctx({ 'x-api-key': 'bad' }).context)
		).rejects.toThrow(new UnauthorizedException('Invalid API key'));
	});

	it('allows a valid key and populates request.user', async () => {
		const user = { id: 7 };
		apiKeyService.validateKey.mockResolvedValue(user);
		const { context, request } = ctx({ 'x-api-key': 'good' });
		await expect(guard.canActivate(context)).resolves.toBe(true);
		expect(request.user).toBe(user);
		expect(request.authMethod).toBe('api-key');
		expect(apiKeyService.updateLastUsed).toHaveBeenCalledWith('good');
	});

	it('uses the first value when the header is an array', async () => {
		apiKeyService.validateKey.mockResolvedValue({ id: 1 });
		await guard.canActivate(ctx({ 'x-api-key': ['first', 'second'] }).context);
		expect(apiKeyService.validateKey).toHaveBeenCalledWith('first');
	});

	it('does not fail when updating last-used rejects', async () => {
		apiKeyService.validateKey.mockResolvedValue({ id: 1 });
		apiKeyService.updateLastUsed.mockRejectedValue(new Error('db down'));
		await expect(
			guard.canActivate(ctx({ 'x-api-key': 'k' }).context)
		).resolves.toBe(true);
	});
});
