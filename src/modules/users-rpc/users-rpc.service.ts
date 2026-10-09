import { Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { AuthService } from '../auth/auth.service';

const MAX_USER_ID = 2147483647;

export type UserPermissionsReply = {
	userId: number;
	roles: string[];
	permissions: string[];
};

@Injectable()
export class UsersRpcService {
	private readonly logger = new Logger(UsersRpcService.name);

	constructor(private readonly authService: AuthService) {}

	async getPermissions(payload: unknown): Promise<UserPermissionsReply> {
		const userId = (payload as { userId?: unknown } | null)?.userId;
		if (
			typeof userId !== 'number' ||
			!Number.isInteger(userId) ||
			userId < 1 ||
			userId > MAX_USER_ID
		) {
			this.logger.warn('users.permissions.get rejected invalid payload');
			throw new RpcException('INVALID_PAYLOAD');
		}
		try {
			const { roles, permissions } = await this.authService.getAccess(userId);
			return { userId, roles, permissions };
		} catch (error) {
			this.logger.error(`users.permissions.get failed: ${error?.message}`);
			throw new RpcException('USERS_INTERNAL_ERROR');
		}
	}
}
