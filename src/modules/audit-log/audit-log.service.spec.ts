import { AuditLogService } from './audit-log.service';

describe('AuditLogService', () => {
	let prisma: any;
	let service: AuditLogService;

	beforeEach(() => {
		prisma = {
			auditLog: {
				findMany: jest.fn().mockResolvedValue([{ id: 1 }]),
				count: jest.fn().mockResolvedValue(1),
				findUnique: jest.fn(),
				create: jest.fn(),
			},
		};
		service = new AuditLogService(prisma);
	});

	it('findAll returns data with pagination', async () => {
		const out = await service.findAll({ where: { id: 1 }, take: 5 });
		expect(out.data).toEqual([{ id: 1 }]);
		expect(prisma.auditLog.count).toHaveBeenCalledWith({ where: { id: 1 } });
	});

	it('findAll propagates database failures', async () => {
		prisma.auditLog.findMany.mockRejectedValue(new Error('db'));
		await expect(service.findAll({})).rejects.toThrow('db');
	});

	it('findOne wraps the record', async () => {
		prisma.auditLog.findUnique.mockResolvedValue({ id: 2 });
		await expect(service.findOne(2)).resolves.toEqual({ data: { id: 2 } });
	});

	it('createAuditLog persists the dto and propagates failures', async () => {
		const dto: any = { action: 'x' };
		prisma.auditLog.create.mockResolvedValue({ id: 3, ...dto });
		await expect(service.createAuditLog(dto)).resolves.toEqual({
			id: 3,
			action: 'x',
		});
		prisma.auditLog.create.mockRejectedValue(new Error('db'));
		await expect(service.createAuditLog(dto)).rejects.toThrow('db');
	});
});
