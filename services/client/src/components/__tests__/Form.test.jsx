import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import Form from '../forms/Form';
import theme from '../../theme';

// Test wrapper component with all necessary providers
const TestWrapper = ({ children }) => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <BrowserRouter>
      {children}
    </BrowserRouter>
  </ThemeProvider>
);

describe('Form Component', () => {
  const mockProps = {
    formType: 'Register',
    isAuthenticated: false,
    loginUser: jest.fn(),
  };

  test('renders register form correctly', () => {
    render(
      <TestWrapper>
        <Form {...mockProps} />
      </TestWrapper>
    );
    
    expect(screen.getByText('Register')).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  test('renders login form correctly', () => {
    render(
      <TestWrapper>
        <Form {...mockProps} formType="Login" />
      </TestWrapper>
    );
    
    expect(screen.getByText('Log In')).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/username/i)).not.toBeInTheDocument();
  });

  test('submit button is disabled by default', () => {
    render(
      <TestWrapper>
        <Form {...mockProps} />
      </TestWrapper>
    );
    
    const submitButton = screen.getByRole('button', { name: /submit/i });
    expect(submitButton).toBeDisabled();
  });
});