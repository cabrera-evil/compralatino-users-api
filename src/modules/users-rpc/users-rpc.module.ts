import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersRpcController } from './users-rpc.controller';
import { UsersRpcService } from './users-rpc.service';

@Module({
	imports: [AuthModule],
	controllers: [UsersRpcController],
	providers: [UsersRpcService],
})
export class UsersRpcModule {}
