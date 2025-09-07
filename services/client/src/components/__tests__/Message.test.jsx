import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';

import Message from '../Message';

const renderMessage = (props) => {
  const theme = createTheme();
  return render(
    <ThemeProvider theme={theme}>
      <Message {...props} />
    </ThemeProvider>
  );
};

describe('When given a success message', () => {
  const removeMessage = jest.fn();

  const messageSuccessProps = {
    messageName: 'Hello, World!',
    messageType: 'success',
    removeMessage: removeMessage,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Message renders properly', () => {
    renderMessage(messageSuccessProps);
    
    // Check that the message text is displayed
    expect(screen.getByText('Hello, World!')).toBeInTheDocument();
    
    // Check that close button exists and works
    const closeButton = screen.getByRole('button');
    expect(closeButton).toBeInTheDocument();
    expect(removeMessage).toHaveBeenCalledTimes(0);
    
    fireEvent.click(closeButton);
    expect(removeMessage).toHaveBeenCalledTimes(1);
  });
});

describe('When given a danger message', () => {
  const removeMessage = jest.fn();

  const messageDangerProps = {
    messageName: 'Hello, World!',
    messageType: 'error',
    removeMessage: removeMessage,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Message renders properly', () => {
    renderMessage(messageDangerProps);
    
    // Check that the message text is displayed
    expect(screen.getByText('Hello, World!')).toBeInTheDocument();
    
    // Check that close button exists and works
    const closeButton = screen.getByRole('button');
    expect(closeButton).toBeInTheDocument();
    expect(removeMessage).toHaveBeenCalledTimes(0);
    
    fireEvent.click(closeButton);
    expect(removeMessage).toHaveBeenCalledTimes(1);
  });
});