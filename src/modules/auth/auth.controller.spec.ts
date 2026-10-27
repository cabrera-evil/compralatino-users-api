import { ProviderGuard } from '@/guards/provider.guard';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';

describe('AuthController (HTTP, mocked service)', () => {
	let app: INestApplication;
	let auth: any;
	let authed = true;
	const allow = {
		canActivate: (ctx: any) => {
			if (!authed) return false;
			ctx.switchToHttp().getRequest().user = { id: 1 };
			return true;
		},
	};

	beforeEach(async () => {
		authed = true;
		auth = {
			login: jest.fn().mockResolvedValue({ data: { jwt: 'j' } }),
			register: jest.fn().mockResolvedValue({ data: { jwt: 'j' } }),
			requestResetToken: jest.fn().mockResolvedValue({ data: {} }),
			profile: jest.fn().mockResolvedValue({ data: { id: 1 } }),
			changePassword: jest.fn().mockResolvedValue({ data: {} }),
		};
		const moduleRef = await Test.createTestingModule({
			controllers: [AuthController],
			providers: [{ provide: AuthService, useValue: auth }],
		})
			.overrideGuard(LocalAuthGuard)
			.useValue(allow)
			.overrideGuard(JwtAuthGuard)
			.useValue(allow)
			.overrideGuard(GoogleAuthGuard)
			.useValue(allow)
			.overrideGuard(ProviderGuard)
			.useValue({ canActivate: () => true })
			.compile();
		app = moduleRef.createNestApplication();
		app.useGlobalPipes(new ValidationPipe({ transform: true }));
		await app.init();
	});

	afterEach(() => app.close());

	const valid = {
		email: 'jane@example.com',
		password: 'Str0ng!pass',
		name: 'Jane Doe',
	};

	it('POST /auth/login returns 201 when the local guard passes', async () => {
		await request(app.getHttpServer())
			.post('/auth/login')
			.send({ identifier: 'a', password: 'b' })
			.expect(201);
		expect(auth.login).toHaveBeenCalledWith(1, expect.anything());
	});

	it('POST /auth/login returns 403 when the guard denies', async () => {
		authed = false;
		await request(app.getHttpServer()).post('/auth/login').expect(403);
		expect(auth.login).not.toHaveBeenCalled();
	});

	it('POST /auth/register returns 201 for a valid body', async () => {
		await request(app.getHttpServer())
			.post('/auth/register')
			.send(valid)
			.expect(201);
		expect(auth.register).toHaveBeenCalled();
	});

	it('POST /auth/register returns 400 for an invalid email and weak password', async () => {
		const res = await request(app.getHttpServer())
			.post('/auth/register')
			.send({ ...valid, email: 'not-an-email', password: 'weak' })
			.expect(400);
		expect(JSON.stringify(res.body.message)).toMatch(/email/i);
		expect(auth.register).not.toHaveBeenCalled();
	});

	it('POST /auth/register returns 400 when identity fields are missing', async () => {
		await request(app.getHttpServer())
			.post('/auth/register')
			.send({ email: valid.email, password: valid.password })
			.expect(400);
	});

	it('POST /auth/forgot-password/request-token returns 400 for a bad email', async () => {
		await request(app.getHttpServer())
			.post('/auth/forgot-password/request-token')
			.send({ email: 'x' })
			.expect(400);
		expect(auth.requestResetToken).not.toHaveBeenCalled();
	});

	it('POST /auth/profile returns 201 when authenticated and 403 when denied', async () => {
		await request(app.getHttpServer()).post('/auth/profile').expect(201);
		authed = false;
		await request(app.getHttpServer()).post('/auth/profile').expect(403);
	});

	it('PATCH /auth/change-password returns 400 for an invalid body', async () => {
		await request(app.getHttpServer())
			.patch('/auth/change-password')
			.send({ currentPassword: 'a', password: 'b', confirmPassword: 'c' })
			.expect(400);
		expect(auth.changePassword).not.toHaveBeenCalled();
	});
});
