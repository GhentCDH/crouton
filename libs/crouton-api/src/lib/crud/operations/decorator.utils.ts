type ControllerClass = { prototype: object };

/** Dynamically define a method on a class prototype. */
export const def = (cls: ControllerClass, method: string, fn: unknown): void => {
  Object.defineProperty(cls.prototype, method, {
    value: fn,
    writable: true,
    configurable: true,
  });
};

/** Get the property descriptor for a method just defined via `def()`. */
export const desc = (cls: ControllerClass, method: string): PropertyDescriptor =>
  Object.getOwnPropertyDescriptor(cls.prototype, method)!;
