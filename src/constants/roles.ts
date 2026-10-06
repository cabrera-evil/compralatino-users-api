export enum AppRole {
	USER = 'USER',
	ADMIN = 'ADMIN',
	SUPER_ADMIN = 'SUPER_ADMIN',
}

// Ordered from lowest to highest privilege
export const APP_ROLE_PRECEDENCE: readonly AppRole[] = [
	AppRole.USER,
	AppRole.ADMIN,
	AppRole.SUPER_ADMIN,
];

export const ROLE_NAME_TO_APP_ROLE: Readonly<Record<string, AppRole>> = {
	user: AppRole.USER,
	admin: AppRole.ADMIN,
	'super-admin': AppRole.SUPER_ADMIN,
};
