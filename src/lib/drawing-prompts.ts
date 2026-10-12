const SUBJECTS = [
	"Batman",
	"cowboy",
	"queen",
	"astronaut",
	"saint",
	"detective",
	"robot",
	"dragon",
	"pirate",
	"bride",
	"boxer",
	"pilot",
	"magician",
	"knight",
	"witch",
	"ghost",
	"samurai",
	"sailor",
	"monster",
	"alien",
	"lion",
	"owl",
	"horse",
	"wolf",
	"angel",
	"clown",
	"chef",
	"dancer",
	"king",
	"hero",
	"villain",
	"giant",
	"mermaid",
	"vampire",
	"pharaoh",
	"viking",
	"rockstar",
	"wizard",
	"ninja",
	"devil",
	"cat",
	"mask",
] as const;

const TWISTS = [
	"graffiti",
	"folk",
	"punk",
	"diner",
	"hometown",
	"ink",
	"midnight",
	"parade",
	"basement",
	"ballroom",
	"roadside",
	"comic",
	"western",
	"kitchen",
	"carnival",
	"noir",
	"thrift",
	"backyard",
	"opera",
] as const;

const TWIST_STEP = 7;
const YEAR_LENGTH = 366;
const LEAP_DAY_INDEX = 59;

const BLOCKED = new Set([
	"nude",
	"naked",
	"sex",
	"sexual",
	"porn",
	"erotic",
	"penis",
	"vagina",
	"nipple",
	"orgasm",
	"gore",
	"gory",
	"corpse",
	"murder",
	"blood",
	"bloody",
	"gun",
	"rifle",
	"bomb",
	"stab",
	"kill",
	"cocaine",
	"heroin",
	"meth",
	"weed",
	"marijuana",
	"cannabis",
	"drug",
	"drugs",
	"child",
	"children",
	"kid",
	"kids",
	"baby",
	"babies",
	"toddler",
	"infant",
	"minor",
	"teen",
	"teenager",
	"nazi",
	"swastika",
	"fuck",
	"shit",
	"ass",
	"damn",
	"bitch",
	"slut",
	"whore",
	"retard",
	"retarded",
	"faggot",
	"fag",
	"dyke",
	"tranny",
	"nigger",
	"nigga",
	"chink",
	"kike",
	"spic",
	"wetback",
]);

const DENVER_DATE = new Intl.DateTimeFormat("en-US", {
	timeZone: "America/Denver",
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
});

/**
 * A twist is a personal register (graffiti, hometown, kitchen). A subject is a
 * character the drawer has to interpret. Day index i picks subject `i % subjects`
 * and twist `(i * step) % twists`. The bank lengths are coprime, and the step is
 * coprime to the twist count, so the first subjects × twists pairs never repeat.
 */
assertPromptBank();

export function promptForDate(date = new Date()): string {
	const { year, month, day } = denverCalendar(date);
	return lineForIndex(promptIndex(year, month, day));
}

function lineForIndex(index: number): string {
	const subject = SUBJECTS[index % SUBJECTS.length];
	const twist = TWISTS[(index * TWIST_STEP) % TWISTS.length];
	if (!subject || !twist) {
		throw new Error("Drawing prompt banks must not be empty.");
	}

	return `Draw ${article(twist)} ${twist} ${subject}`;
}

function article(twist: string): "a" | "an" {
	return /^[aeiou]/i.test(twist) ? "an" : "a";
}

function promptIndex(year: number, month: number, day: number): number {
	const dayIndex = dayOfYear(year, month, day);
	if (isLeapYear(year)) {
		return dayIndex;
	}

	return dayIndex < LEAP_DAY_INDEX ? dayIndex : dayIndex + 1;
}

function dayOfYear(year: number, month: number, day: number): number {
	const start = Date.UTC(year, 0, 1);
	const today = Date.UTC(year, month - 1, day);
	return Math.round((today - start) / 86_400_000);
}

function isLeapYear(year: number): boolean {
	return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function denverCalendar(date: Date): { year: number; month: number; day: number } {
	const parts = DENVER_DATE.formatToParts(date);
	const year = numberPart(parts, "year");
	const month = numberPart(parts, "month");
	const day = numberPart(parts, "day");

	return { year, month, day };
}

function numberPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): number {
	const value = parts.find((part) => part.type === type)?.value;
	const number = Number(value);
	if (!value || !Number.isInteger(number)) {
		throw new Error("Could not resolve the Denver calendar date.");
	}

	return number;
}

function assertPromptBank(): void {
	if (isEmpty(SUBJECTS) || isEmpty(TWISTS)) {
		throw new Error("Drawing prompt banks must not be empty.");
	}

	if (gcd(SUBJECTS.length, TWISTS.length) !== 1 || gcd(TWIST_STEP, TWISTS.length) !== 1) {
		throw new Error("Drawing prompt banks must stay coprime so each day is unique.");
	}

	for (const subject of SUBJECTS) {
		assertClean(subject, "subject");
	}

	for (const twist of TWISTS) {
		assertClean(twist, "twist");
	}

	const lines = Array.from({ length: YEAR_LENGTH }, (_, index) => lineForIndex(index));
	if (new Set(lines).size !== lines.length) {
		throw new Error("Drawing prompts repeat within the year.");
	}

	for (const line of lines) {
		assertClean(line, "line");
	}
}

function isEmpty(bank: readonly string[]): boolean {
	return bank.length === 0;
}

function assertClean(value: string, label: string): void {
	for (const word of value.toLowerCase().split(/[^a-z]+/)) {
		if (BLOCKED.has(word)) {
			throw new Error(`Drawing prompt ${label} contains blocked word "${word}".`);
		}
	}
}

function gcd(left: number, right: number): number {
	let a = left;
	let b = right;
	while (b !== 0) {
		const next = a % b;
		a = b;
		b = next;
	}

	return a;
}
