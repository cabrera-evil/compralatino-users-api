import { NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';

jest.mock('@/utils/bcrypt.util', () => ({
	hashPassword: jest.fn().mockResolvedValue('hashed'),
}));

describe('UserService', () => {
	let prisma: any;
	let files: any;
	let service: UserService;

	beforeEach(() => {
		prisma = {
			user: {
				findMany: jest.fn().mockResolvedValue([{ id: 1, password: 'x' }]),
				count: jest.fn().mockResolvedValue(1),
				findUnique: jest.fn(),
				create: jest.fn((a) => ({ id: 1, ...a.data })),
				update: jest.fn((a) => ({ id: 1, ...a.data })),
				delete: jest.fn(),
			},
		};
		files = { uploadAndSave: jest.fn().mockResolvedValue({ id: 9 }) };
		service = new UserService(prisma, files);
	});

	it('findAll strips sensitive fields', async () => {
		const out: any = await service.findAll({});
		expect(out.data[0].password).toBeUndefined();
	});

	it('findOne throws NotFound when missing', async () => {
		prisma.user.findUnique.mockResolvedValue(null);
		await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
	});

	it('create hashes the password and attaches an uploaded picture', async () => {
		const out: any = await service.create(
			{ email: 'a', password: 'plain' } as any,
			{} as any
		);
		expect(prisma.user.create.mock.calls[0][0].data.password).toBe('hashed');
		expect(prisma.user.create.mock.calls[0][0].data.picture).toBe(9);
		expect(out.data.password).toBeUndefined();
	});

	it('update throws NotFound and does not write when user is missing', async () => {
		prisma.user.findUnique.mockResolvedValue(null);
		await expect(service.update(1, {} as any)).rejects.toThrow(
			NotFoundException
		);
		expect(prisma.user.update).not.toHaveBeenCalled();
	});

	it('update rehashes a supplied password', async () => {
		prisma.user.findUnique.mockResolvedValue({ id: 1 });
		await service.update(1, { password: 'new' } as any);
		expect(prisma.user.update.mock.calls[0][0].data.password).toBe('hashed');
	});

	it('remove throws NotFound for a missing user, deletes otherwise', async () => {
		prisma.user.findUnique.mockResolvedValueOnce(null);
		await expect(service.remove(1)).rejects.toThrow(NotFoundException);
		expect(prisma.user.delete).not.toHaveBeenCalled();
		prisma.user.findUnique.mockResolvedValueOnce({ id: 1 });
		await service.remove(1);
		expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 1 } });
	});
});
