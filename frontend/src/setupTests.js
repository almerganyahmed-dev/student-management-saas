import '@testing-library/jest-dom/vitest'

// Recent Node versions ship an experimental native localStorage global that
// can end up shadowing (and breaking) jsdom's own implementation depending
// on Node version — accessing it just warns and returns undefined. Replace
// it with a minimal in-memory polyfill so tests are consistent regardless
// of which Node runs them.
function createMemoryStorage() {
  let store = {}
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => {
      store[key] = String(value)
    },
    removeItem: (key) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
}

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  writable: true,
  value: createMemoryStorage(),
})
