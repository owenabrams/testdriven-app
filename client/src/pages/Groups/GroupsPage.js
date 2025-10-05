import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Fab,
  Dialog,
  Chip,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Add,
  Search,
  MoreVert,
  Groups,
  LocationOn,
  People,
  AccountBalance,
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { savingsGroupsAPI } from '../../services/api';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import CreateGroupDialog from '../../components/Groups/CreateGroupDialog';

export default function GroupsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(searchParams.get('action') === 'create');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);

  const { data: groups, isLoading, refetch } = useQuery({
    queryKey: ['savings-groups'],
    queryFn: () => savingsGroupsAPI.getGroups(),
    select: (response) => response.data?.groups || [],
  });

  const filteredGroups = (groups && Array.isArray(groups)) ? groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.district?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.parish?.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  const handleMenuOpen = (event, group) => {
    setAnchorEl(event.currentTarget);
    setSelectedGroup(group);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedGroup(null);
  };

  const handleCreateSuccess = () => {
    setCreateDialogOpen(false);
    refetch();
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading savings groups..." />;
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Savings Groups
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your community savings groups
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setCreateDialogOpen(true)}
          size="large"
        >
          Create Group
        </Button>
      </Box>

      {/* Search */}
      <Box mb={3}>
        <TextField
          fullWidth
          placeholder="Search groups by name, district, or parish..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          sx={{ maxWidth: 500 }}
        />
      </Box>

      {/* Groups Grid */}
      {filteredGroups.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Groups sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              {groups?.length === 0 ? 'No savings groups yet' : 'No groups match your search'}
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              {groups?.length === 0 
                ? 'Create your first savings group to get started'
                : 'Try adjusting your search terms'
              }
            </Typography>
            {groups?.length === 0 && (
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setCreateDialogOpen(true)}
              >
                Create First Group
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {filteredGroups.map((group) => (
            <Grid item xs={12} sm={6} md={4} key={group.id}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 4,
                  },
                }}
                onClick={() => navigate(`/groups/${group.id}`)}
              >
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
                      {group.name.charAt(0)}
                    </Avatar>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMenuOpen(e, group);
                      }}
                    >
                      <MoreVert />
                    </IconButton>
                  </Box>

                  <Typography variant="h6" gutterBottom noWrap>
                    {group.name}
                  </Typography>

                  <Box display="flex" alignItems="center" mb={1}>
                    <LocationOn sx={{ fontSize: 16, color: 'text.secondary', mr: 0.5 }} />
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {group.district}, {group.parish}
                    </Typography>
                  </Box>

                  <Box display="flex" alignItems="center" mb={2}>
                    <People sx={{ fontSize: 16, color: 'text.secondary', mr: 0.5 }} />
                    <Typography variant="body2" color="text.secondary">
                      {group.member_count || 0} members
                    </Typography>
                  </Box>

                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="body2" color="text.secondary">
                      Total Balance
                    </Typography>
                    <Typography variant="h6" color="primary.main" fontWeight="bold">
                      UGX {(group.total_balance || 0).toLocaleString()}
                    </Typography>
                  </Box>

                  <Box display="flex" gap={1} flexWrap="wrap">
                    <Chip
                      label={group.status || 'Active'}
                      size="small"
                      color={group.status === 'active' ? 'success' : 'default'}
                    />
                    {group.active_campaigns_count > 0 && (
                      <Chip
                        label={`${group.active_campaigns_count} campaigns`}
                        size="small"
                        color="secondary"
                      />
                    )}
                    {group.active_loans_count > 0 && (
                      <Chip
                        label={`${group.active_loans_count} loans`}
                        size="small"
                        color="warning"
                      />
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Floating Action Button for Mobile */}
      <Fab
        color="primary"
        aria-label="add group"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          display: { xs: 'flex', md: 'none' },
        }}
        onClick={() => setCreateDialogOpen(true)}
      >
        <Add />
      </Fab>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          navigate(`/groups/${selectedGroup?.id}`);
          handleMenuClose();
        }}>
          View Details
        </MenuItem>
        <MenuItem onClick={() => {
          navigate(`/groups/${selectedGroup?.id}?tab=members`);
          handleMenuClose();
        }}>
          Manage Members
        </MenuItem>
        <MenuItem onClick={() => {
          navigate(`/groups/${selectedGroup?.id}?tab=savings`);
          handleMenuClose();
        }}>
          Record Savings
        </MenuItem>
        <MenuItem onClick={() => {
          navigate(`/groups/${selectedGroup?.id}?tab=analytics`);
          handleMenuClose();
        }}>
          View Analytics
        </MenuItem>
      </Menu>

      {/* Create Group Dialog */}
      <CreateGroupDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSuccess={handleCreateSuccess}
      />
    </Box>
  );
}