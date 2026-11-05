// Minimal local typings for lodash-es (no @types/lodash-es dependency).
declare module 'lodash-es' {
  export function cloneDeep<T>(value: T): T;
}
