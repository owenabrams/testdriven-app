import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  Box,
  Typography,
  Alert,
  MenuItem,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { savingsGroupsAPI } from '../../services/api';
import toast from 'react-hot-toast';

const ugandanDistricts = [
  'Kampala', 'Wakiso', 'Mukono', 'Jinja', 'Mbale', 'Gulu', 'Lira', 'Mbarara',
  'Kasese', 'Masaka', 'Hoima', 'Soroti', 'Arua', 'Kabale', 'Moroto', 'Kitgum'
];

export default function CreateGroupDialog({ open, onClose, onSuccess }) {
  const [error, setError] = useState('');
  
  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm();

  const createGroupMutation = useMutation({
    mutationFn: (data) => savingsGroupsAPI.createGroup(data),
    onSuccess: (response) => {
      if (response.data.status === 'success') {
        toast.success('Savings group created successfully!');
        reset();
        onSuccess();
      } else {
        setError(response.data.message || 'Failed to create group');
      }
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to create group';
      setError(message);
      toast.error(message);
    },
  });

  const onSubmit = (data) => {
    setError('');
    createGroupMutation.mutate({
      ...data,
      formation_date: data.formation_date || new Date().toISOString().split('T')[0],
    });
  };

  const handleClose = () => {
    reset();
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h5" fontWeight="bold">
          Create New Savings Group
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Set up a new community savings group with enhanced features
        </Typography>
      </DialogTitle>

      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={3}>
            {/* Basic Information */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom color="primary">
                Basic Information
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Group Name"
                {...register('name', { 
                  required: 'Group name is required',
                  minLength: { value: 3, message: 'Name must be at least 3 characters' }
                })}
                error={!!errors.name}
                helperText={errors.name?.message}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Formation Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                {...register('formation_date')}
                error={!!errors.formation_date}
                helperText={errors.formation_date?.message}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                {...register('description', {
                  required: 'Description is required',
                  minLength: { value: 10, message: 'Description must be at least 10 characters' }
                })}
                error={!!errors.description}
                helperText={errors.description?.message}
                placeholder="Describe the purpose and goals of this savings group..."
              />
            </Grid>

            {/* Location Information */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom color="primary" sx={{ mt: 2 }}>
                Location Details
              </Typography>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                select
                label="District"
                {...register('district', { required: 'District is required' })}
                error={!!errors.district}
                helperText={errors.district?.message}
              >
                {ugandanDistricts.map((district) => (
                  <MenuItem key={district} value={district}>
                    {district}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Parish"
                {...register('parish', { required: 'Parish is required' })}
                error={!!errors.parish}
                helperText={errors.parish?.message}
                placeholder="e.g., Central, Nakawa"
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Village"
                {...register('village', { required: 'Village is required' })}
                error={!!errors.village}
                helperText={errors.village?.message}
                placeholder="e.g., Nakasero, Bugolobi"
              />
            </Grid>

            {/* Regional Information */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                label="Country"
                defaultValue="Uganda"
                {...register('country')}
              >
                <MenuItem value="Uganda">Uganda</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                label="Region"
                {...register('region', { required: 'Region is required' })}
                error={!!errors.region}
                helperText={errors.region?.message}
              >
                <MenuItem value="Central">Central</MenuItem>
                <MenuItem value="Eastern">Eastern</MenuItem>
                <MenuItem value="Northern">Northern</MenuItem>
                <MenuItem value="Western">Western</MenuItem>
              </TextField>
            </Grid>

            {/* Officer Role Selection */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom color="primary" sx={{ mt: 2 }}>
                Your Role in the Group
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                label="Your Officer Role"
                {...register('creator_role', { required: 'Officer role is required' })}
                error={!!errors.creator_role}
                helperText={errors.creator_role?.message || 'As the group creator, you will be assigned this officer role'}
                SelectProps={{ native: true }}
              >
                <option value="">Select Your Role</option>
                <option value="secretary">Secretary</option>
                <option value="chair">Chairperson</option>
                <option value="treasurer">Treasurer</option>
              </TextField>
            </Grid>

            <Grid item xs={12} md={6}>
              <Box sx={{ p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                <Typography variant="body2" color="info.contrastText">
                  <strong>Officer Responsibilities:</strong>
                  <br />
                  • <strong>Secretary:</strong> Record keeping, meeting minutes
                  • <strong>Chairperson:</strong> Group leadership, meetings
                  • <strong>Treasurer:</strong> Financial management, loans
                </Typography>
              </Box>
            </Grid>

            {/* Additional Information */}
            <Grid item xs={12}>
              <Box sx={{ p: 2, bgcolor: 'primary.light', borderRadius: 1, mt: 2 }}>
                <Typography variant="body2" color="primary.contrastText">
                  <strong>Enhanced Features Available:</strong>
                  <br />
                  • Multiple saving types (Personal, ECD Fund, Social Fund, Target)
                  • Mobile money integration for remote savings
                  • Democratic target campaigns with voting
                  • Automated loan assessment system
                  • Comprehensive financial tracking and analytics
                  • Meeting attendance and fines management
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleClose} disabled={createGroupMutation.isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={createGroupMutation.isLoading}
            size="large"
          >
            {createGroupMutation.isLoading ? 'Creating...' : 'Create Group'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}