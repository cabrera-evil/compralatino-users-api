import { UserEventPattern } from '@/constants/events';
import { RABBITMQ_SERVICE } from '@/constants/rabbitmq';
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { randomUUID } from 'node:crypto';

export interface UserRegisteredEvent {
	eventId: string;
	userId: number;
	occurredAt: string;
}

@Injectable()
export class UserEventsPublisher {
	private readonly logger = new Logger(UserEventsPublisher.name);

	constructor(
		@Optional()
		@Inject(RABBITMQ_SERVICE)
		private readonly client?: ClientProxy
	) {}

	publishUserRegistered(userId: number): void {
		if (!this.client) return;
		const payload: UserRegisteredEvent = {
			eventId: randomUUID(),
			userId,
			occurredAt: new Date().toISOString(),
		};
		try {
			this.client.emit(UserEventPattern.REGISTERED, payload).subscribe({
				error: (error: unknown) =>
					this.logger.error(
						`Failed to publish "${UserEventPattern.REGISTERED}": ${String(error)}`
					),
			});
		} catch (error) {
			this.logger.error(
				`Failed to publish "${UserEventPattern.REGISTERED}": ${String(error)}`
			);
		}
	}
}
