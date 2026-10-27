import { RpcException } from '@nestjs/microservices';
import { RpcAuthGuard } from './rpc-auth.guard';

describe('RpcAuthGuard', () => {
	const original = process.env.API_KEYS;
	let apiKeyService: any;
	let guard: RpcAuthGuard;

	const ctx = (data: any) =>
		({ switchToRpc: () => ({ getData: () => data }) }) as any;

	beforeEach(() => {
		delete process.env.API_KEYS;
		apiKeyService = {
			validateKey: jest.fn(),
			updateLastUsed: jest.fn().mockResolvedValue(undefined),
		};
		guard = new RpcAuthGuard(apiKeyService);
	});

	afterAll(() => {
		if (original === undefined) delete process.env.API_KEYS;
		else process.env.API_KEYS = original;
	});

	it('denies a payload without an api key', async () => {
		await expect(guard.canActivate(ctx({}))).rejects.toThrow(RpcException);
		await expect(guard.canActivate(ctx(undefined))).rejects.toThrow(
			'Missing API key'
		);
	});

	it('denies an unknown key that is not in API_KEYS', async () => {
		apiKeyService.validateKey.mockResolvedValue(null);
		process.env.API_KEYS = 'a, b';
		await expect(
			guard.canActivate(ctx({ auth: { apiKey: 'nope' } }))
		).rejects.toThrow('Invalid API key');
	});

	it('allows a key stored in the database', async () => {
		apiKeyService.validateKey.mockResolvedValue({ id: 1 });
		await expect(guard.canActivate(ctx({ apiKey: 'db-key' }))).resolves.toBe(
			true
		);
		expect(apiKeyService.updateLastUsed).toHaveBeenCalledWith('db-key');
	});

	it('allows a key from the API_KEYS env fallback', async () => {
		apiKeyService.validateKey.mockResolvedValue(null);
		process.env.API_KEYS = 'a, env-key';
		await expect(
			guard.canActivate(ctx({ auth: { apiKey: 'env-key' } }))
		).resolves.toBe(true);
	});
});
