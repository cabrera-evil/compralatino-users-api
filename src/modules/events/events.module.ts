import { Module } from '@nestjs/common';
import { UserEventsPublisher } from './user-events.publisher';

@Module({
	providers: [UserEventsPublisher],
	exports: [UserEventsPublisher],
})
export class EventsModule {}
