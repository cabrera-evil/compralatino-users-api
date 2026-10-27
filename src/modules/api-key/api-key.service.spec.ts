import { NotFoundException } from '@nestjs/common';
import { ApiKeyService } from './api-key.service';

describe('ApiKeyService', () => {
	let prisma: any;
	let service: ApiKeyService;
	const dbKey = (plain: string, over: any = {}) => ({
		id: 1,
		key: service.hashApiKey(plain),
		status: 'ACTIVE',
		expiresAt: null,
		user: { id: 5, username: 'u', userRoles: [{ role: { id: 1, name: 'r' } }] },
		...over,
	});

	beforeEach(() => {
		prisma = {
			apiKey: {
				findUnique: jest.fn(),
				findFirst: jest.fn(),
				update: jest.fn(),
				updateMany: jest.fn(),
				create: jest.fn(),
				delete: jest.fn(),
			},
		};
		service = new ApiKeyService(prisma);
	});

	describe('validateKey', () => {
		it('rejects an empty/malformed key without querying', async () => {
			await expect(service.validateKey('')).resolves.toBeNull();
			expect(prisma.apiKey.findUnique).not.toHaveBeenCalled();
		});

		it('rejects an unknown key', async () => {
			prisma.apiKey.findUnique.mockResolvedValue(null);
			await expect(service.validateKey('nope')).resolves.toBeNull();
		});

		it('looks keys up by hash, never by plaintext', async () => {
			prisma.apiKey.findUnique.mockResolvedValue(null);
			await service.validateKey('plain');
			expect(prisma.apiKey.findUnique.mock.calls[0][0].where.key).toBe(
				service.hashApiKey('plain')
			);
		});

		it.each(['REVOKED', 'EXPIRED'])('rejects a %s key', async (status) => {
			prisma.apiKey.findUnique.mockResolvedValue(dbKey('k', { status }));
			await expect(service.validateKey('k')).resolves.toBeNull();
		});

		it('rejects and auto-expires a key past its expiresAt', async () => {
			prisma.apiKey.findUnique.mockResolvedValue(
				dbKey('k', { expiresAt: new Date(Date.now() - 1000) })
			);
			await expect(service.validateKey('k')).resolves.toBeNull();
			expect(prisma.apiKey.update).toHaveBeenCalledWith({
				where: { id: 1 },
				data: { status: 'EXPIRED' },
			});
		});

		it('rejects a record whose stored hash is malformed', async () => {
			prisma.apiKey.findUnique.mockResolvedValue(dbKey('k', { key: 'zz' }));
			await expect(service.validateKey('k')).resolves.toBeNull();
		});

		it('returns the user with flattened roles for an active key', async () => {
			prisma.apiKey.findUnique.mockResolvedValue(dbKey('k'));
			const user: any = await service.validateKey('k');
			expect(user.id).toBe(5);
			expect(user.roles).toEqual([{ id: 1, name: 'r' }]);
			expect(user.userRoles).toBeUndefined();
		});
	});

	describe('create', () => {
		it('stores only the hash and returns the plaintext once', async () => {
			prisma.apiKey.create.mockImplementation(({ data }: any) => ({
				id: 1,
				...data,
				createdAt: new Date(),
				user: { id: 5, username: 'u', email: 'e', userRoles: [] },
			}));
			const out: any = await service.create(5, { name: 'n' } as any);
			const stored = prisma.apiKey.create.mock.calls[0][0].data.key;
			expect(out.data.key).not.toBe(stored);
			expect(stored).toBe(service.hashApiKey(out.data.key));
		});
	});

	describe('not-found paths', () => {
		it('findOne / revoke / remove throw NotFound for foreign or missing keys', async () => {
			prisma.apiKey.findFirst.mockResolvedValue(null);
			await expect(service.findOne(1, 2)).rejects.toThrow(NotFoundException);
			await expect(service.revoke(1, 2)).rejects.toThrow(NotFoundException);
			await expect(service.remove(1, 2)).rejects.toThrow(NotFoundException);
			expect(prisma.apiKey.update).not.toHaveBeenCalled();
			expect(prisma.apiKey.delete).not.toHaveBeenCalled();
		});

		it('revoke marks the key REVOKED', async () => {
			prisma.apiKey.findFirst.mockResolvedValue({ id: 1 });
			prisma.apiKey.update.mockResolvedValue({ id: 1, keyPrefix: 'abcd' });
			await service.revoke(1, 2);
			expect(prisma.apiKey.update.mock.calls[0][0].data).toEqual({
				status: 'REVOKED',
			});
		});
	});

	describe('updateLastUsed', () => {
		it('swallows database errors', async () => {
			prisma.apiKey.updateMany.mockRejectedValue(new Error('db'));
			await expect(service.updateLastUsed('k')).resolves.toBeUndefined();
		});
	});
});
