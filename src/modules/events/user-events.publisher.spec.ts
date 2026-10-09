import { ClientProxy } from '@nestjs/microservices';
import { of, throwError } from 'rxjs';
import { UserEventsPublisher } from './user-events.publisher';

describe('UserEventsPublisher', () => {
	it('emits user.registered with eventId, userId and ISO occurredAt', () => {
		const emit = jest.fn().mockReturnValue(of(undefined));
		new UserEventsPublisher({
			emit,
		} as unknown as ClientProxy).publishUserRegistered(42);
		expect(emit).toHaveBeenCalledTimes(1);
		const [pattern, payload] = emit.mock.calls[0];
		expect(pattern).toBe('user.registered');
		expect(payload.userId).toBe(42);
		expect(payload.eventId).toMatch(/^[0-9a-f-]{36}$/i);
		expect(new Date(payload.occurredAt).toISOString()).toBe(payload.occurredAt);
	});

	it('is a no-op when RabbitMQ is disabled', () => {
		expect(() =>
			new UserEventsPublisher().publishUserRegistered(1)
		).not.toThrow();
	});

	it('never throws when the broker rejects or emit throws', () => {
		const failing = jest
			.fn()
			.mockReturnValue(throwError(() => new Error('down')));
		expect(() =>
			new UserEventsPublisher({
				emit: failing,
			} as unknown as ClientProxy).publishUserRegistered(1)
		).not.toThrow();
		const throwing = jest.fn(() => {
			throw new Error('sync');
		});
		expect(() =>
			new UserEventsPublisher({
				emit: throwing,
			} as unknown as ClientProxy).publishUserRegistered(1)
		).not.toThrow();
	});
});
