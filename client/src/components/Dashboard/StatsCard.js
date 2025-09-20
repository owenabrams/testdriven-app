import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Avatar,
} from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';

export default function StatsCard({ title, value, icon, color, change }) {
  const isPositive = change?.startsWith('+');

  return (
    <Card
      sx={{
        height: '100%',
        transition: 'all 0.3s ease-in-out',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: (theme) => theme.shadows[8],
        }
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box sx={{ flex: 1 }}>
            <Typography
              color="text.secondary"
              gutterBottom
              variant="body2"
              sx={{ fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}
            >
              {title}
            </Typography>
            <Typography
              variant="h4"
              component="div"
              sx={{
                fontWeight: 700,
                mb: 1,
                color: 'text.primary'
              }}
            >
              {value}
            </Typography>
            {change && (
              <Box display="flex" alignItems="center" mt={1}>
                {isPositive ? (
                  <TrendingUp sx={{ fontSize: 18, color: 'success.main', mr: 0.5 }} />
                ) : (
                  <TrendingDown sx={{ fontSize: 18, color: 'error.main', mr: 0.5 }} />
                )}
                <Typography
                  variant="body2"
                  sx={{
                    color: isPositive ? 'success.main' : 'text.secondary',
                    fontWeight: 500
                  }}
                >
                  {change}
                </Typography>
              </Box>
            )}
          </Box>
          <Avatar
            sx={{
              bgcolor: `${color}.main`,
              color: 'white',
              width: 56,
              height: 56,
              boxShadow: (theme) => theme.shadows[3],
            }}
          >
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );
}