import { RpcException } from '@nestjs/microservices';
import { UsersRpcService } from './users-rpc.service';

describe('UsersRpcService', () => {
	let auth: any;
	let service: UsersRpcService;

	beforeEach(() => {
		auth = { getAccess: jest.fn() };
		service = new UsersRpcService(auth);
	});

	it.each([
		null,
		{},
		{ userId: '1' },
		{ userId: 0 },
		{ userId: -1 },
		{ userId: 1.5 },
		{ userId: 2147483648 },
	])('rejects invalid payload %j', async (payload) => {
		await expect(service.getPermissions(payload)).rejects.toThrow(
			new RpcException('INVALID_PAYLOAD')
		);
		expect(auth.getAccess).not.toHaveBeenCalled();
	});

	it('returns roles and permissions for a valid payload', async () => {
		auth.getAccess.mockResolvedValue({
			role: 'USER',
			roles: ['r'],
			permissions: ['p'],
		});
		await expect(service.getPermissions({ userId: 3 })).resolves.toEqual({
			userId: 3,
			roles: ['r'],
			permissions: ['p'],
		});
	});

	it('maps lookup failures to USERS_INTERNAL_ERROR', async () => {
		auth.getAccess.mockRejectedValue(new Error('db'));
		await expect(service.getPermissions({ userId: 3 })).rejects.toThrow(
			new RpcException('USERS_INTERNAL_ERROR')
		);
	});
});
