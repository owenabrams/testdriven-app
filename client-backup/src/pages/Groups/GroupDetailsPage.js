import React, { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  Grid,
  Chip,
  Avatar,
  Button,
} from '@mui/material';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import { savingsGroupsAPI } from '../../services/api';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import GroupOverview from '../../components/Groups/GroupOverview';
import GroupMembers from '../../components/Groups/GroupMembers';
import GroupSavings from '../../components/Groups/GroupSavings';
import GroupCashbook from '../../components/Groups/GroupCashbook';
import GroupAnalytics from '../../components/Groups/GroupAnalytics';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`group-tabpanel-${index}`}
      aria-labelledby={`group-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function GroupDetailsPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'overview';
  
  const tabMap = {
    overview: 0,
    members: 1,
    savings: 2,
    cashbook: 3,
    analytics: 4,
  };
  
  const [tab, setTab] = useState(tabMap[initialTab] || 0);

  const { data: group, isLoading } = useQuery(
    ['savings-group', id],
    () => savingsGroupsAPI.getGroup(id),
    {
      select: (response) => response.data.data,
    }
  );

  if (isLoading) {
    return <LoadingSpinner message="Loading group details..." />;
  }

  if (!group) {
    return (
      <Box textAlign="center" py={6}>
        <Typography variant="h6">Group not found</Typography>
      </Box>
    );
  }

  const handleTabChange = (event, newValue) => {
    setTab(newValue);
  };

  return (
    <Box>
      {/* Group Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item>
              <Avatar sx={{ bgcolor: 'primary.main', width: 64, height: 64, fontSize: '1.5rem' }}>
                {group.name.charAt(0)}
              </Avatar>
            </Grid>
            <Grid item xs>
              <Typography variant="h4" gutterBottom>
                {group.name}
              </Typography>
              <Typography variant="body1" color="text.secondary" gutterBottom>
                {group.description}
              </Typography>
              <Box display="flex" gap={1} flexWrap="wrap">
                <Chip label={`${group.district}, ${group.parish}`} variant="outlined" />
                <Chip label={`${group.member_count || 0} members`} color="primary" />
                <Chip 
                  label={`UGX ${(group.total_balance || 0).toLocaleString()}`} 
                  color="success" 
                />
              </Box>
            </Grid>
            <Grid item>
              <Button variant="contained" size="large">
                Group Actions
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tab} onChange={handleTabChange} aria-label="group tabs">
          <Tab label="Overview" />
          <Tab label="Members" />
          <Tab label="Savings" />
          <Tab label="Cashbook" />
          <Tab label="Analytics" />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <TabPanel value={tab} index={0}>
        <GroupOverview group={group} />
      </TabPanel>
      <TabPanel value={tab} index={1}>
        <GroupMembers groupId={id} />
      </TabPanel>
      <TabPanel value={tab} index={2}>
        <GroupSavings groupId={id} />
      </TabPanel>
      <TabPanel value={tab} index={3}>
        <GroupCashbook groupId={id} />
      </TabPanel>
      <TabPanel value={tab} index={4}>
        <GroupAnalytics groupId={id} />
      </TabPanel>
    </Box>
  );
}