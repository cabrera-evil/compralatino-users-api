import { BadRequestException } from '@nestjs/common';
import { RoleService } from './role.service';

describe('RoleService system role guards', () => {
	const sys = { id: 1, name: 'admin', isSystem: true };
	const custom = { id: 2, name: 'custom', isSystem: false };
	let prisma: any;
	let service: RoleService;

	beforeEach(() => {
		prisma = {
			role: {
				findUnique: jest.fn(({ where }) => (where.id === 1 ? sys : custom)),
				create: jest.fn((a) => a.data),
				update: jest.fn((a) => ({ ...custom, ...a.data })),
				delete: jest.fn(),
			},
		};
		service = new RoleService(prisma);
	});

	it('rejects renaming a system role', async () => {
		await expect(service.update(1, { name: 'x' })).rejects.toThrow(
			BadRequestException
		);
		expect(prisma.role.update).not.toHaveBeenCalled();
	});

	it('rejects changing isSystem on a system role', async () => {
		await expect(service.update(1, { isSystem: false })).rejects.toThrow(
			BadRequestException
		);
		expect(prisma.role.update).not.toHaveBeenCalled();
	});

	it('allows editing the description of a system role', async () => {
		await service.update(1, { description: 'd' });
		expect(prisma.role.update).toHaveBeenCalled();
	});

	it('rejects promoting a non-system role to system', async () => {
		await expect(service.update(2, { isSystem: true })).rejects.toThrow(
			'Roles cannot be promoted to system roles'
		);
		expect(prisma.role.update).not.toHaveBeenCalled();
	});

	it('rejects creating a role with isSystem=true', async () => {
		await expect(service.create({ name: 'x', isSystem: true })).rejects.toThrow(
			BadRequestException
		);
		expect(prisma.role.create).not.toHaveBeenCalled();
	});

	it('still rejects deleting a system role', async () => {
		await expect(service.remove(1)).rejects.toThrow(BadRequestException);
		expect(prisma.role.delete).not.toHaveBeenCalled();
	});

	it('lets a non-system role be created, renamed and deleted', async () => {
		await service.create({ name: 'n' });
		await service.update(2, { name: 'renamed', isSystem: false });
		await service.remove(2);
		expect(prisma.role.create).toHaveBeenCalled();
		expect(prisma.role.update).toHaveBeenCalled();
		expect(prisma.role.delete).toHaveBeenCalled();
	});
});
