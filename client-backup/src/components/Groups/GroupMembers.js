import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
} from '@mui/material';
import { Add } from '@mui/icons-material';

export default function GroupMembers({ groupId }) {
  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            Group Members
          </Typography>
          <Button variant="contained" startIcon={<Add />}>
            Add Member
          </Button>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Member management interface will be implemented here.
        </Typography>
      </CardContent>
    </Card>
  );
}