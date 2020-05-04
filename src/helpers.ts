import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
import * as path from 'path';

export const isDevEnv = process.env.NODE_ENV === 'development';
export const isTestEnv = process.env.NODE_ENV === 'test';

export const APP_DIR = __dirname;
export const REPO_DIR = path.dirname(__dirname);

function createEnumChecker<T extends string, TEnumValue extends number>(
  enumVariable: { [key in T]: TEnumValue }
): (value: number) => value is TEnumValue {
  // Create a set of valid enum number values.
  const enumValues = Object.values<number>(enumVariable).filter(v => typeof v === 'number');
  const enumValueSet = new Set<number>(enumValues);
  return (value: number): value is TEnumValue => enumValueSet.has(value);
}

const enumCheckFunctions = new Map<object, (value: number) => boolean>();

/**
 * Type guard to check if a given value is a valid enum value.
 * @param enumVariable - Literal `enum` type.
 * @param value - A value to check against the enum's values.
 * @example
 * ```ts
 * enum Color {
 *   Purple = 3,
 *   Orange = 5
 * }
 * const val: number = 3;
 * if (isEnum(Color, val)) {
 *   // `val` is known as enum type `Color`, e.g.:
 *   const colorVal: Color = val;
 * }
 * ```
 */
export function isEnum<T extends string, TEnumValue extends number>(
  enumVariable: { [key in T]: TEnumValue },
  value: number
): value is TEnumValue {
  const checker = enumCheckFunctions.get(enumVariable);
  if (checker !== undefined) {
    return checker(value);
  }
  const newChecker = createEnumChecker(enumVariable);
  enumCheckFunctions.set(enumVariable, newChecker);
  return isEnum(enumVariable, value);
}

export function parseEnum<T extends string, TEnumValue extends number>(
  enumVariable: { [key in T]: TEnumValue },
  num: number,
  invalidEnumErrorFormatter?: (val: number) => Error
): TEnumValue {
  if (isEnum(enumVariable, num)) {
    return num;
  } else if (invalidEnumErrorFormatter !== undefined) {
    throw invalidEnumErrorFormatter(num);
  } else {
    throw new Error(`Failed to parse enum from value "${num}".`);
  }
}

const enumMaps = new Map<object, Map<unknown, unknown>>();

export function getEnumDescription<T extends string, TEnumValue extends number>(
  enumVariable: { [key in T]: TEnumValue },
  value: number
): string {
  const enumMap = enumMaps.get(enumVariable);
  if (enumMap !== undefined) {
    const enumKey = enumMap.get(value);
    if (enumKey !== undefined) {
      return `${value} '${enumKey}'`;
    } else {
      return `${value}`;
    }
  }

  // Create a map of `[enumValue: number]: enumNameString`
  const enumValues = Object.entries(enumVariable)
    .filter(([, v]) => typeof v === 'number')
    .map<[number, string]>(([k, v]) => [v as number, k]);
  const newEnumMap = new Map(enumValues);
  enumMaps.set(enumVariable, newEnumMap);
  return getEnumDescription(enumVariable, value);
}

let didLoadDotEnv = false;

export function loadDotEnv(): void {
  if (didLoadDotEnv) {
    return;
  }
  const dotenvConfig = dotenv.config();
  if (dotenvConfig.error) {
    console.error(`Error loading .env file: ${dotenvConfig.error}`);
    console.error(dotenvConfig.error);
    throw dotenvConfig.error;
  }
  didLoadDotEnv = true;
}

export function parsePort(portVal: number | string | undefined): number | undefined {
  if (portVal === undefined) {
    return undefined;
  }
  if (/^[-+]?(\d+|Infinity)$/.test(portVal.toString())) {
    const port = Number(portVal);
    if (port < 1 || port > 65535) {
      throw new Error(`Port ${port} is invalid`);
    }
    return port;
  } else {
    throw new Error(`Port ${portVal} is invalid`);
  }
}

export function getCurrentGitTag(): string {
  if (!isDevEnv && !isTestEnv) {
    const tagEnvVar = (process.env.GIT_TAG || '').trim();
    if (!tagEnvVar) {
      const error =
        'Production requires the GIT_TAG env var to be set. Set `NODE_ENV=development` to use the current git tag';
      console.error(error);
      throw new Error(error);
    }
    return tagEnvVar;
  }

  try {
    const gitTag = (execSync('git tag --points-at HEAD', { encoding: 'utf8' }) ?? '').trim();
    const gitCommit = (execSync('git rev-parse --short HEAD', { encoding: 'utf8' }) ?? '').trim();
    const result = gitTag || gitCommit;
    if (!result) {
      throw new Error('no git tag or commit hash available');
    }
    return result;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

/** JSON.stringify with support for bigint types. */
export function jsonStringify(obj: object): string {
  const stringified = JSON.stringify(obj, (_key, value) => {
    if (typeof value === 'bigint') {
      return '0x' + value.toString(16);
    }
    return value;
  });
  return stringified;
}

/** Encodes a buffer as a `0x` prefixed lower-case hex string. */
export function bufferToHexPrefixString(buff: Buffer): string {
  return '0x' + buff.toString('hex');
}

/**
 * Decodes a `0x` prefixed hex string to a buffer.
 * @param hex - A hex string with a `0x` prefix.
 */
export function hexToBuffer(hex: string): Buffer {
  if (!hex.startsWith('0x')) {
    throw new Error(`Hex string is missing the "0x" prefix: "${hex}"`);
  }
  if (hex.length % 2 !== 0) {
    throw new Error(`Hex string is an odd number of digits: ${hex}`);
  }
  return Buffer.from(hex.substring(2), 'hex');
}

export function assertNotNullish<T>(val: T, onNullish?: () => string): Exclude<T, undefined> {
  if (val === undefined) {
    throw new Error(onNullish?.() ?? 'value is undefined');
  }
  if (val === null) {
    throw new Error(onNullish?.() ?? 'value is null');
  }
  return val as Exclude<T, undefined>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ElementType<T extends any[]> = T extends (infer U)[] ? U : never;

export function timeout(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
}

export function waiter(): Promise<void> & {
  finish: () => void;
} {
  let resolveFn: () => void;
  const promise = new Promise<void>(resolve => {
    resolveFn = resolve;
  });
  return Object.assign(promise, { finish: () => resolveFn() });
}

export function stopwatch(): {
  /** Milliseconds since stopwatch was created. */
  getElapsed: () => number;
} {
  const start = process.hrtime();
  return {
    getElapsed: () => {
      const hrend = process.hrtime(start);
      return hrend[0] * 1000 + hrend[1] / 1000000;
    },
  };
}

export type Json = string | number | boolean | null | { [property: string]: Json } | Json[];

/**
 * Escape a string for use as a css selector name.
 * From https://github.com/mathiasbynens/CSS.escape/blob/master/css.escape.js
 */
export function cssEscape(value: string): string {
  const string = value;
  const length = string.length;
  let index = -1;
  let codeUnit: number;
  let result = '';
  const firstCodeUnit = string.charCodeAt(0);
  while (++index < length) {
    codeUnit = string.charCodeAt(index);
    // Note: there’s no need to special-case astral symbols, surrogate
    // pairs, or lone surrogates.

    // If the character is NULL (U+0000), then the REPLACEMENT CHARACTER
    // (U+FFFD).
    if (codeUnit == 0x0000) {
      result += '\uFFFD';
      continue;
    }

    if (
      // If the character is in the range [\1-\1F] (U+0001 to U+001F) or is
      // U+007F, […]
      (codeUnit >= 0x0001 && codeUnit <= 0x001f) ||
      codeUnit == 0x007f ||
      // If the character is the first character and is in the range [0-9]
      // (U+0030 to U+0039), […]
      (index == 0 && codeUnit >= 0x0030 && codeUnit <= 0x0039) ||
      // If the character is the second character and is in the range [0-9]
      // (U+0030 to U+0039) and the first character is a `-` (U+002D), […]
      (index == 1 && codeUnit >= 0x0030 && codeUnit <= 0x0039 && firstCodeUnit == 0x002d)
    ) {
      // https://drafts.csswg.org/cssom/#escape-a-character-as-code-point
      result += '\\' + codeUnit.toString(16) + ' ';
      continue;
    }

    if (
      // If the character is the first character and is a `-` (U+002D), and
      // there is no second character, […]
      index == 0 &&
      length == 1 &&
      codeUnit == 0x002d
    ) {
      result += '\\' + string.charAt(index);
      continue;
    }

    // If the character is not handled by one of the above rules and is
    // greater than or equal to U+0080, is `-` (U+002D) or `_` (U+005F), or
    // is in one of the ranges [0-9] (U+0030 to U+0039), [A-Z] (U+0041 to
    // U+005A), or [a-z] (U+0061 to U+007A), […]
    if (
      codeUnit >= 0x0080 ||
      codeUnit == 0x002d ||
      codeUnit == 0x005f ||
      (codeUnit >= 0x0030 && codeUnit <= 0x0039) ||
      (codeUnit >= 0x0041 && codeUnit <= 0x005a) ||
      (codeUnit >= 0x0061 && codeUnit <= 0x007a)
    ) {
      // the character itself
      result += string.charAt(index);
      continue;
    }

    // Otherwise, the escaped character.
    // https://drafts.csswg.org/cssom/#escape-a-character
    result += '\\' + string.charAt(index);
  }
  return result;
}

export const has0xPrefix = (id: string) => id.substr(0, 2) === '0x';
