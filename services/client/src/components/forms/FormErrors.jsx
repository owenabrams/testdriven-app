import React from 'react';
import { Box, List, ListItem, Typography } from '@mui/material';
import { CheckCircle, Cancel } from '@mui/icons-material';

const FormErrors = (props) => {
  return (
    <Box sx={{ mb: 2 }}>
      <List className="validation-list" sx={{ p: 0 }}>
        {props.formRules.map((rule) => (
          <ListItem 
            key={rule.id}
            className={rule.valid ? "success" : "error"}
            sx={{ 
              py: 0.5,
              px: 0,
              display: 'flex',
              alignItems: 'center',
              color: rule.valid ? '#23D160' : '#FF3860'
            }}
          >
            {rule.valid ? (
              <CheckCircle sx={{ mr: 1, fontSize: 16, color: '#23D160' }} />
            ) : (
              <Cancel sx={{ mr: 1, fontSize: 16, color: '#FF3860' }} />
            )}
            <Typography 
              variant="body2" 
              sx={{ 
                color: rule.valid ? '#23D160' : '#FF3860',
                fontSize: '0.875rem'
              }}
            >
              {rule.name}
            </Typography>
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default FormErrors;