import React from 'react';
import { render } from '@testing-library/react';
import App from './App';

// Mock any problematic dependencies
jest.mock('./contexts/AuthContext', () => ({
  AuthProvider: ({ children }) => <div>{children}</div>,
  useAuth: () => ({ user: null, login: jest.fn(), logout: jest.fn() })
}));

jest.mock('./contexts/NotificationContext', () => ({
  NotificationProvider: ({ children }) => <div>{children}</div>,
  useNotification: () => ({ showNotification: jest.fn() })
}));

test('app component exists', () => {
  expect(App).toBeDefined();
});

test('renders without crashing', () => {
  // Simple render test without complex assertions
  const { container } = render(<App />);
  expect(container).toBeTruthy();
});
