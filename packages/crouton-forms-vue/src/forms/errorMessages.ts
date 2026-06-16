import { z } from 'zod';

const errorPatterns: [RegExp, string][] = [
  [/^Invalid input: expected \w+, received undefined$/, 'This field is required'],
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
export const formatError = (message: string | undefined): string | undefined => {
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
export const registerZodErrorMap = () => {
  z.config({
    customError: (issue) => {
      if (issue.code === 'invalid_type' && issue.received === 'undefined') {
        return { message: 'This field is required' };
      }
      if (issue.code === 'invalid_type' && issue.received === 'null') {
        return { message: 'This field is required' };
      }
      if (issue.code === 'too_small') {
        const i = issue as any;
        if (i.type === 'string' && i.minimum === 1) {
          return { message: 'This field is required' };
        }
        if (i.type === 'string') {
          return { message: `Must be at least ${i.minimum} characters` };
        }
      }
      if (issue.code === 'too_big') {
        const i = issue as any;
        if (i.type === 'string') {
          return { message: `Must be at most ${i.maximum} characters` };
        }
      }
      return { message: issue.message ?? '' };
    },
  });
};
