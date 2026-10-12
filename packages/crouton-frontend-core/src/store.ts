export type Store<T> = {
  get: () => T;
  set: (next: T) => void;
  update: (fn: (s: T) => T) => void;
  subscribe: (listener: (s: T) => void) => () => void;
};

export const createStore = <T>(initial: T): Store<T> => {
  let state = initial;
  const listeners = new Set<(s: T) => void>();

  const notify = () => listeners.forEach((l) => l(state));

  return {
    get: () => state,
    set: (next) => { state = next; notify(); },
    update: (fn) => { state = fn(state); notify(); },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
};
