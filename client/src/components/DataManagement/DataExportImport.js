import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Download,
  Upload,
  TableChart,
  Assessment,
  Backup,
  CloudDownload,
  CloudUpload,
  CheckCircle,
  Error,
} from '@mui/icons-material';
import { apiClient } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

export default function DataExportImport({ groupId }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [importDialog, setImportDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [importResults, setImportResults] = useState(null);

  const exportOptions = [
    {
      id: 'members',
      title: 'Group Members',
      description: 'Export all group members with their details',
      icon: <TableChart />,
      endpoint: `/export/group/${groupId}/members`,
      filename: `group_${groupId}_members.csv`
    },
    {
      id: 'activities',
      title: 'Meeting Activities',
      description: 'Export all meeting activities and transactions',
      icon: <Assessment />,
      endpoint: `/export/group/${groupId}/activities`,
      filename: `group_${groupId}_activities.csv`
    },
    {
      id: 'financial',
      title: 'Financial Summary',
      description: 'Export comprehensive financial report',
      icon: <Assessment />,
      endpoint: `/export/group/${groupId}/financial-summary`,
      filename: `group_${groupId}_financial.json`
    },
    {
      id: 'backup',
      title: 'Complete Backup',
      description: 'Export complete group data backup',
      icon: <Backup />,
      endpoint: `/backup/group/${groupId}`,
      filename: `group_${groupId}_backup.json`,
      adminOnly: true
    }
  ];

  const handleExport = async (option) => {
    setLoading(true);
    try {
      const response = await apiClient.get(option.endpoint, {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', option.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await apiClient.post('/import/members', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setImportResults(response.data);
    } catch (error) {
      console.error('Import failed:', error);
      setImportResults({
        error: error.response?.data?.error || 'Import failed'
      });
    } finally {
      setLoading(false);
    }
  };

  const closeImportDialog = () => {
    setImportDialog(false);
    setSelectedFile(null);
    setImportResults(null);
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Data Export & Import
      </Typography>

      {/* Export Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Export Data
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Download your group data in various formats for backup or analysis.
          </Typography>

          <Grid container spacing={2}>
            {exportOptions.map((option) => {
              // Check admin permissions
              if (option.adminOnly && user?.role !== 'ADMIN') {
                return null;
              }

              return (
                <Grid item xs={12} sm={6} md={3} key={option.id}>
                  <Card variant="outlined" sx={{ height: '100%' }}>
                    <CardContent>
                      <Box display="flex" alignItems="center" mb={1}>
                        {option.icon}
                        <Typography variant="h6" sx={{ ml: 1 }}>
                          {option.title}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {option.description}
                      </Typography>
                      <Button
                        variant="contained"
                        startIcon={<Download />}
                        onClick={() => handleExport(option)}
                        disabled={loading}
                        fullWidth
                        size="small"
                      >
                        Export
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </CardContent>
      </Card>

      {/* Import Section */}
      {user?.role === 'ADMIN' && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Import Data
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Import member data from CSV files. Only administrators can perform imports.
            </Typography>

            <Button
              variant="outlined"
              startIcon={<Upload />}
              onClick={() => setImportDialog(true)}
              disabled={loading}
            >
              Import Members
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Import Dialog */}
      <Dialog open={importDialog} onClose={closeImportDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Import Members</DialogTitle>
        <DialogContent>
          {!importResults ? (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                Upload a CSV file with member data. Required columns: name, phone, group_id
              </Alert>

              <TextField
                type="file"
                fullWidth
                onChange={handleFileSelect}
                inputProps={{ accept: '.csv' }}
                sx={{ mb: 2 }}
              />

              {selectedFile && (
                <Alert severity="success">
                  Selected file: {selectedFile.name}
                </Alert>
              )}

              {loading && <LinearProgress sx={{ mt: 2 }} />}
            </Box>
          ) : (
            <Box>
              {importResults.error ? (
                <Alert severity="error">
                  {importResults.error}
                </Alert>
              ) : (
                <Box>
                  <Alert severity="success" sx={{ mb: 2 }}>
                    {importResults.message}
                  </Alert>

                  {importResults.errors && importResults.errors.length > 0 && (
                    <Box>
                      <Typography variant="h6" color="error" gutterBottom>
                        Import Errors:
                      </Typography>
                      <List dense>
                        {importResults.errors.map((error, index) => (
                          <ListItem key={index}>
                            <ListItemIcon>
                              <Error color="error" />
                            </ListItemIcon>
                            <ListItemText primary={error} />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeImportDialog}>
            {importResults ? 'Close' : 'Cancel'}
          </Button>
          {!importResults && (
            <Button
              onClick={handleImport}
              variant="contained"
              disabled={!selectedFile || loading}
            >
              Import
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
