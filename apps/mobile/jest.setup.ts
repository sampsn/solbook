import '@testing-library/jest-native/extend-expect'

// Prevent Expo's winter runtime from installing globals that break jest's
// scoped module registry. These polyfills aren't needed in the test env.
jest.mock('expo/src/winter/installGlobal', () => ({
  installGlobal: () => {},
}))
