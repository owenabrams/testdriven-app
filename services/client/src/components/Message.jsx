import React from 'react';
import {
  Alert,
  IconButton,
  Collapse,
  Box
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon
} from '@mui/icons-material';

const Message = (props) => {
  const getSeverity = (messageType) => {
    switch (messageType) {
      case 'success':
        return 'success';
      case 'danger':
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
      default:
        return 'info';
    }
  };

  const getIcon = (messageType) => {
    switch (messageType) {
      case 'success':
        return <SuccessIcon fontSize="inherit" />;
      case 'danger':
      case 'error':
        return <ErrorIcon fontSize="inherit" />;
      case 'warning':
        return <WarningIcon fontSize="inherit" />;
      case 'info':
      default:
        return <InfoIcon fontSize="inherit" />;
    }
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Collapse in={!!props.messageName}>
        <Alert
          severity={getSeverity(props.messageType)}
          icon={getIcon(props.messageType)}
          action={
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={() => props.removeMessage()}
            >
              <CloseIcon fontSize="inherit" />
            </IconButton>
          }
          sx={{
            borderRadius: 2,
            '& .MuiAlert-message': {
              fontSize: '1rem',
              fontWeight: 500
            }
          }}
        >
          {props.messageName}
        </Alert>
      </Collapse>
    </Box>
  );
};

export default Message;
