// Tutorial-style setup but with modern compatibility
import '@testing-library/jest-dom';

// Resolution for requestAnimationFrame not supported in jest error
global.window = global;
window.addEventListener = () => {};
window.requestAnimationFrame = () => {
  throw new Error('requestAnimationFrame is not supported in Node');
};

// Mock IndexedDB for tests
require('fake-indexeddb/auto');

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
});

// Mock the idb library
jest.mock('idb', () => ({
  openDB: jest.fn(() => Promise.resolve({
    createObjectStore: jest.fn(),
    objectStoreNames: { contains: jest.fn(() => false) },
    transaction: jest.fn(() => ({
      objectStore: jest.fn(() => ({
        add: jest.fn(() => Promise.resolve()),
        put: jest.fn(() => Promise.resolve()),
        get: jest.fn(() => Promise.resolve()),
        getAll: jest.fn(() => Promise.resolve([])),
        delete: jest.fn(() => Promise.resolve()),
        clear: jest.fn(() => Promise.resolve()),
        createIndex: jest.fn()
      })),
      done: Promise.resolve()
    })),
    add: jest.fn(() => Promise.resolve()),
    put: jest.fn(() => Promise.resolve()),
    get: jest.fn(() => Promise.resolve()),
    getAll: jest.fn(() => Promise.resolve([])),
    delete: jest.fn(() => Promise.resolve())
  }))
}));
