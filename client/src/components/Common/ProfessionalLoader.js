import React from 'react';
import {
  Box,
  CircularProgress,
  Typography,
  Card,
  CardContent,
  Skeleton,
  Grid,
} from '@mui/material';

export default function ProfessionalLoader({ 
  message = "Loading...", 
  variant = "circular",
  showSkeleton = false 
}) {
  if (showSkeleton) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width="60%" height={40} sx={{ mb: 2 }} />
        <Skeleton variant="text" width="40%" height={24} sx={{ mb: 4 }} />
        
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map((item) => (
            <Grid item xs={12} sm={6} md={3} key={item}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box sx={{ flex: 1 }}>
                      <Skeleton variant="text" width="80%" height={20} />
                      <Skeleton variant="text" width="60%" height={32} sx={{ mt: 1 }} />
                      <Skeleton variant="text" width="40%" height={16} sx={{ mt: 1 }} />
                    </Box>
                    <Skeleton variant="circular" width={56} height={56} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
        
        <Box sx={{ mt: 4 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Skeleton variant="text" width="30%" height={24} sx={{ mb: 2 }} />
                  {[1, 2, 3].map((item) => (
                    <Box key={item} sx={{ mb: 2 }}>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Skeleton variant="circular" width={40} height={40} />
                        <Box sx={{ flex: 1 }}>
                          <Skeleton variant="text" width="70%" height={20} />
                          <Skeleton variant="text" width="50%" height={16} />
                        </Box>
                      </Box>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Skeleton variant="text" width="40%" height={24} sx={{ mb: 2 }} />
                  {[1, 2, 3].map((item) => (
                    <Box key={item} sx={{ mb: 2 }}>
                      <Skeleton variant="text" width="90%" height={20} />
                      <Skeleton variant="text" width="60%" height={16} />
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </Box>
    );
  }

  if (variant === "minimal") {
    return (
      <Box 
        display="flex" 
        alignItems="center" 
        justifyContent="center" 
        sx={{ p: 2 }}
      >
        <CircularProgress size={24} sx={{ mr: 2 }} />
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      </Box>
    );
  }

  return (
    <Box 
      display="flex" 
      flexDirection="column"
      alignItems="center" 
      justifyContent="center" 
      sx={{ 
        minHeight: '400px',
        p: 4,
        textAlign: 'center'
      }}
    >
      <Box sx={{ position: 'relative', mb: 3 }}>
        <CircularProgress 
          size={60} 
          thickness={4}
          sx={{ 
            color: 'primary.main',
            animationDuration: '1.5s'
          }} 
        />
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CircularProgress 
            variant="determinate" 
            value={25}
            size={60}
            thickness={4}
            sx={{ 
              color: 'primary.light',
              position: 'absolute',
              animationDuration: '2s'
            }}
          />
        </Box>
      </Box>
      
      <Typography 
        variant="h6" 
        color="text.primary" 
        sx={{ mb: 1, fontWeight: 500 }}
      >
        {message}
      </Typography>
      
      <Typography 
        variant="body2" 
        color="text.secondary"
        sx={{ maxWidth: 300 }}
      >
        Please wait while we load your data...
      </Typography>
    </Box>
  );
}
