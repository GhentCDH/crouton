import { z } from 'zod';

const errorPatterns: [RegExp, string][] = [
  [
    /^Invalid input: expected \w+, received undefined$/,
    'This field is required',
  ],
  [/^Invalid input: expected \w+, received null$/, 'This field is required'],
  [/^Expected string, received/, 'Invalid value'],
  [/^String must contain at least (\d+)/, 'Must be at least $1 characters'],
  [/^Number must be greater than or equal to (\d+)/, 'Minimum value is $1'],
  [/^Number must be less than or equal to (\d+)/, 'Maximum value is $1'],
];

/**
 * Transforms raw Zod error messages into human-readable ones.
 * Returns original message if no pattern matches.
 */
export const formatError = (
  message: string | undefined,
): string | undefined => {
  if (!message) return undefined;

  for (const [pattern, replacement] of errorPatterns) {
    if (pattern.test(message)) {
      return message.replace(pattern, replacement);
    }
  }

  return message;
};

/**
 * Registers a global Zod error map for friendlier default messages.
 * Call once at app startup or in FormComponent setup.
 */
type CustomErrorIssue = Parameters<
  Exclude<z.core.$ZodConfig['customError'], undefined>
>[0];
type IssueTester = (issue: CustomErrorIssue) => boolean;

const isRequired: IssueTester = (issue) =>
  ((issue.code === 'invalid_type' || issue.code === 'invalid_value') &&
    (issue.input === undefined || issue.input === null)) ||
  (issue.code === 'too_small' &&
    (issue as any).origin === 'string' &&
    (issue as any).minimum === 1);

const isTooSmallString: IssueTester = (issue) =>
  issue.code === 'too_small' && (issue as any).origin === 'string';

const isTooBigString: IssueTester = (issue) =>
  issue.code === 'too_big' && (issue as any).origin === 'string';

const errorDictionary: {
  test: IssueTester;
  message: string | ((issue: CustomErrorIssue) => string);
}[] = [
  { test: isRequired, message: 'This field is required' },
  {
    test: isTooSmallString,
    message: (issue) => `Must be at least ${(issue as any).minimum} characters`,
  },
  {
    test: isTooBigString,
    message: (issue) => `Must be at most ${(issue as any).maximum} characters`,
  },
];

export const registerZodErrorMap = () => {
  z.config({
    customError: (issue) => {
      if (issue.message) return { message: issue.message };
      const match = errorDictionary.find((entry) => entry.test(issue));
      if (match) {
        return {
          message:
            typeof match.message === 'function'
              ? match.message(issue)
              : match.message,
        };
      }
      return { message: issue.message ?? issue.code };
    },
  });
};
