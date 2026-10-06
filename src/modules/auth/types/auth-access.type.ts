import { AppRole } from '@/constants/roles';
import { ApiProperty } from '@nestjs/swagger';

export class AuthAccess {
	@ApiProperty({ enum: AppRole, description: 'Highest-privilege role' })
	role: AppRole;

	@ApiProperty({ type: [String], description: 'Assigned role names' })
	roles: string[];

	@ApiProperty({ type: [String], description: 'Deduplicated permission codes' })
	permissions: string[];
}
