import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import App from '../../App';
import { AuthProvider } from '../../context/AuthContext';

// Mock localStorage
beforeAll(() => {
  global.localStorage = {
    getItem: () => 'someToken'
  };
});

// Mock fetch
global.fetch = jest.fn();

// Mock useMediaQuery
jest.mock('@mui/material/useMediaQuery', () => jest.fn());

beforeEach(() => {
  // Mock useMediaQuery to return false (desktop)
  const useMediaQuery = require('@mui/material/useMediaQuery');
  useMediaQuery.mockReturnValue(false);
  
  // Mock fetch to return empty users array
  fetch.mockResolvedValue({
    ok: true,
    json: async () => ({ data: { users: [] } }),
  });
});

test('App renders without crashing', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const theme = createTheme();

  const wrapper = render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <AuthProvider>
          <Router>
            <App />
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
  
  // Just check that it renders without throwing
  expect(wrapper).toBeTruthy();
});