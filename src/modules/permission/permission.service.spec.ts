import { NotFoundException } from '@nestjs/common';
import { PermissionService } from './permission.service';

describe('PermissionService', () => {
	let prisma: any;
	let service: PermissionService;

	beforeEach(() => {
		prisma = {
			permission: {
				findMany: jest.fn().mockResolvedValue([{ id: 1 }]),
				count: jest.fn().mockResolvedValue(1),
				findUnique: jest.fn(),
			},
		};
		service = new PermissionService(prisma);
	});

	it('findAll returns data with pagination', async () => {
		const out = await service.findAll({ take: 10, skip: 0 });
		expect(out.data).toEqual([{ id: 1 }]);
		expect(out.pagination).toBeDefined();
	});

	it('findAll propagates database failures', async () => {
		prisma.permission.findMany.mockRejectedValue(new Error('db'));
		await expect(service.findAll()).rejects.toThrow('db');
	});

	it('findOne returns the permission', async () => {
		prisma.permission.findUnique.mockResolvedValue({ id: 1 });
		await expect(service.findOne(1)).resolves.toEqual({ data: { id: 1 } });
	});

	it('findOne throws NotFound when missing', async () => {
		prisma.permission.findUnique.mockResolvedValue(null);
		await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
	});
});
