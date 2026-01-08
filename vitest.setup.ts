// Vitest setup file
import { vi } from 'vitest';

// Mock crypto for edge function tests
if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = {
    randomUUID: () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    },
  } as Crypto;
}

// Mock performance for timing tests
if (typeof globalThis.performance === 'undefined') {
  globalThis.performance = {
    now: () => Date.now(),
  } as Performance;
}

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});
