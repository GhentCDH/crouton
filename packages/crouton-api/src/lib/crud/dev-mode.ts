/**
 * `true` when running in development mode.
 * Works in both Node and Vite (Vite replaces process.env.NODE_ENV at build time).
 */
export const IS_DEV = process.env['NODE_ENV'] !== 'production';
