import {
	IsEmail,
	IsNotEmpty,
	IsString,
	IsStrongPassword,
	Matches,
	MaxLength,
	ValidateIf,
} from 'class-validator';

const LEGACY_FIELDS_MESSAGE =
	'Provide either name, or firstName, lastName and username';

const NAME_MAX_LENGTH = 100;
const USERNAME_MAX_LENGTH = 50;

export class CreateRegisterDto {
	@ValidateIf((o: CreateRegisterDto) => o.name !== undefined)
	@IsString()
	@IsNotEmpty({ message: LEGACY_FIELDS_MESSAGE })
	@Matches(/\S/, { message: LEGACY_FIELDS_MESSAGE })
	@MaxLength(NAME_MAX_LENGTH)
	name?: string;

	@ValidateIf(
		(o: CreateRegisterDto) => o.name === undefined || o.username !== undefined
	)
	@IsString({ message: LEGACY_FIELDS_MESSAGE })
	@IsNotEmpty({ message: LEGACY_FIELDS_MESSAGE })
	@MaxLength(USERNAME_MAX_LENGTH)
	username?: string;

	@ValidateIf((o: CreateRegisterDto) => o.name === undefined)
	@IsString({ message: LEGACY_FIELDS_MESSAGE })
	@IsNotEmpty({ message: LEGACY_FIELDS_MESSAGE })
	firstName?: string;

	@ValidateIf((o: CreateRegisterDto) => o.name === undefined)
	@IsString({ message: LEGACY_FIELDS_MESSAGE })
	@IsNotEmpty({ message: LEGACY_FIELDS_MESSAGE })
	lastName?: string;

	@IsString()
	@IsEmail()
	@IsNotEmpty()
	email: string;

	@IsStrongPassword({
		minLength: 8,
		minLowercase: 1,
		minUppercase: 1,
		minNumbers: 1,
		minSymbols: 1,
	})
	@IsNotEmpty()
	password: string;

	constructor(
		email: string,
		password: string,
		username?: string,
		firstName?: string,
		lastName?: string,
		name?: string
	) {
		this.email = email;
		this.password = password;
		this.username = username;
		this.firstName = firstName;
		this.lastName = lastName;
		this.name = name;
	}
}
