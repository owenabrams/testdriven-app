import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import FormErrors from '../../forms/FormErrors';
import { registerFormRules, loginFormRules } from '../../forms/form-rules';
import theme from '../../../theme';

// Test wrapper component with all necessary providers
const TestWrapper = ({ children }) => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <BrowserRouter>
      {children}
    </BrowserRouter>
  </ThemeProvider>
);

const testData = [
  {
    formType: 'Register',
    formRules: registerFormRules,
    expectedRules: [
      'Username must be greater than 5 characters.',
      'Email must be greater than 5 characters.',
      'Email must be a valid email address.',
      'Password must be greater than 10 characters.'
    ]
  },
  {
    formType: 'Login',
    formRules: loginFormRules,
    expectedRules: [
      'Email is required.',
      'Password is required.'
    ]
  }
];

describe('FormErrors Component', () => {
  testData.forEach((el) => {
    test(`FormErrors (with ${el.formType} form) renders properly`, () => {
      const { container } = render(
        <TestWrapper>
          <FormErrors 
            formType={el.formType}
            formRules={el.formRules}
          />
        </TestWrapper>
      );
      
      // Check that all expected rules are rendered
      el.expectedRules.forEach(rule => {
        expect(container.textContent).toContain(rule);
      });
      
      // Check that the correct number of list items are rendered
      const listItems = container.querySelectorAll('li');
      expect(listItems.length).toBe(el.expectedRules.length);
    });

    test(`FormErrors (with ${el.formType} form) renders a snapshot properly`, () => {
      const { container } = render(
        <TestWrapper>
          <FormErrors 
            formType={el.formType}
            formRules={el.formRules}
          />
        </TestWrapper>
      );
      expect(container.firstChild).toMatchSnapshot();
    });
  });
});