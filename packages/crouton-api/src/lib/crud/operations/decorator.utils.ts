/** Dynamically define a method on a class prototype. */
export const def = (cls: any, method: string, fn: (...args: any[]) => any): void => {
  Object.defineProperty(cls.prototype, method, {
    value: fn,
    writable: true,
    configurable: true,
  });
};

/** Get the property descriptor for a method just defined via `def()`. */
export const desc = (cls: any, method: string): PropertyDescriptor =>
  Object.getOwnPropertyDescriptor(cls.prototype, method)!;
