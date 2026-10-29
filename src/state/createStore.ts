import { useSyncExternalStore } from 'react';

export type Store<T> = {
  get: () => T;
  set: (patch: Partial<T> | ((state: T) => Partial<T>)) => void;
  subscribe: (listener: () => void) => () => void;
};

export function createStore<T extends object>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set: (patch) => {
      const next = typeof patch === 'function' ? patch(state) : patch;
      state = { ...state, ...next };
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export function useStore<T, S>(store: Store<T>, selector: (state: T) => S): S {
  return useSyncExternalStore(store.subscribe, () => selector(store.get()));
}
