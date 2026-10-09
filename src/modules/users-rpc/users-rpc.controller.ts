import { USERS_PERMISSIONS_GET_PATTERN } from '@/constants/rabbitmq';
import { SkipEncryption } from '@/decorators/skip-encryption.decorator';
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UsersRpcService } from './users-rpc.service';

@Controller()
@SkipEncryption()
export class UsersRpcController {
	constructor(private readonly usersRpcService: UsersRpcService) {}

	@MessagePattern(USERS_PERMISSIONS_GET_PATTERN)
	getPermissions(@Payload() payload: unknown) {
		return this.usersRpcService.getPermissions(payload);
	}
}
