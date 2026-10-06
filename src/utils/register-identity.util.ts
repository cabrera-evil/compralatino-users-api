const USERNAME_MAX_LENGTH = 50;
const USERNAME_BASE_MAX_LENGTH = 40;
const USERNAME_FALLBACK = 'user';

export function splitFullName(name: string): {
	firstName: string;
	lastName: string;
} {
	const trimmed = name.trim();
	const [firstName] = trimmed.split(/\s+/);
	const remainder = trimmed.slice(firstName.length).trim();
	return { firstName, lastName: remainder || firstName };
}

export function usernameBaseFromEmail(email: string): string {
	const localPart = email.split('@')[0].toLowerCase();
	const sanitized = localPart.replace(/[^a-z0-9._-]/g, '');
	return sanitized.slice(0, USERNAME_BASE_MAX_LENGTH) || USERNAME_FALLBACK;
}

export function pickAvailableUsername(
	base: string,
	taken: ReadonlySet<string>
): string {
	if (!taken.has(base)) return base;
	for (let suffix = 1; ; suffix++) {
		const candidate = `${base.slice(0, USERNAME_MAX_LENGTH - String(suffix).length)}${suffix}`;
		if (!taken.has(candidate)) return candidate;
	}
}
