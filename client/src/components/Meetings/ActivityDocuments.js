import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Alert,
  LinearProgress,
  Divider
} from '@mui/material';
import {
  Upload,
  AttachFile,
  PictureAsPdf,
  Description,
  Image,
  Slideshow,
  Verified,
  Download,
  Delete,
  CloudUpload
} from '@mui/icons-material';
import { apiClient } from '../../services/api';

const DOCUMENT_TYPES = {
  'HANDWRITTEN_RECORD': { label: 'Handwritten Record', icon: <Description />, color: 'primary' },
  'ATTENDANCE_SHEET': { label: 'Attendance Sheet', icon: <Description />, color: 'info' },
  'SAVINGS_RECEIPT': { label: 'Savings Receipt', icon: <AttachFile />, color: 'success' },
  'LOAN_DOCUMENT': { label: 'Loan Document', icon: <Description />, color: 'warning' },
  'PHOTO_PROOF': { label: 'Photo Proof', icon: <Image />, color: 'secondary' },
  'SIGNATURE_SHEET': { label: 'Signature Sheet', icon: <Description />, color: 'info' },
  'MEETING_MINUTES': { label: 'Meeting Minutes', icon: <Description />, color: 'primary' },
  'OTHER': { label: 'Other Document', icon: <AttachFile />, color: 'default' }
};

const FILE_TYPE_ICONS = {
  'pdf': <PictureAsPdf color="error" />,
  'doc': <Description color="primary" />,
  'docx': <Description color="primary" />,
  'ppt': <Slideshow color="warning" />,
  'pptx': <Slideshow color="warning" />,
  'jpg': <Image color="success" />,
  'jpeg': <Image color="success" />,
  'png': <Image color="success" />,
  'gif': <Image color="success" />,
  'bmp': <Image color="success" />
};

export default function ActivityDocuments({ activityId, meetingId, userRole, onUpdate }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadData, setUploadData] = useState({
    document_type: 'OTHER',
    title: '',
    description: '',
    access_level: 'GROUP'
  });
  const [summary, setSummary] = useState({
    total_documents: 0,
    verified_documents: 0,
    document_types: []
  });

  useEffect(() => {
    if (activityId) {
      fetchDocuments();
    }
  }, [activityId]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/activities/${activityId}/documents`);
      if (response.data.status === 'success') {
        setDocuments(response.data.data.documents);
        setSummary(response.data.data.summary);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setUploadData(prev => ({
        ...prev,
        title: prev.title || file.name
      }));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('document_type', uploadData.document_type);
      formData.append('title', uploadData.title);
      formData.append('description', uploadData.description);
      formData.append('access_level', uploadData.access_level);

      const endpoint = activityId
        ? `/activities/${activityId}/documents/upload`
        : `/meetings/${meetingId}/documents/upload`;

      const response = await apiClient.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.status === 'success') {
        setUploadDialogOpen(false);
        setSelectedFile(null);
        setUploadData({
          document_type: 'OTHER',
          title: '',
          description: '',
          access_level: 'GROUP'
        });
        fetchDocuments();
        if (onUpdate) onUpdate();
      }
    } catch (error) {
      console.error('Error uploading document:', error);
    } finally {
      setUploading(false);
    }
  };

  const canUploadDocuments = () => {
    return userRole === 'chairperson' || userRole === 'secretary' || userRole === 'admin';
  };

  const getFileIcon = (fileType) => {
    return FILE_TYPE_ICONS[fileType] || <AttachFile />;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Activity Documents</Typography>
          <LinearProgress />
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Activity Documents
            </Typography>
            {canUploadDocuments() && (
              <Button
                variant="contained"
                startIcon={<Upload />}
                onClick={() => setUploadDialogOpen(true)}
              >
                Upload Document
              </Button>
            )}
          </Box>

          {summary.total_documents > 0 && (
            <Box sx={{ mb: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="primary">
                      {summary.total_documents}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Documents
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="success.main">
                      {summary.verified_documents}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Verified
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Document Types
                  </Typography>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    {summary.document_types.map((type) => (
                      <Chip 
                        key={type} 
                        label={DOCUMENT_TYPES[type]?.label || type} 
                        size="small" 
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </Grid>
              </Grid>
              <Divider sx={{ my: 2 }} />
            </Box>
          )}

          {documents.length === 0 ? (
            <Alert severity="info">
              No documents uploaded yet. {canUploadDocuments() && 'Click "Upload Document" to add proof documents for this activity.'}
            </Alert>
          ) : (
            <List>
              {documents.map((document, index) => {
                const docType = DOCUMENT_TYPES[document.document_type] || DOCUMENT_TYPES['OTHER'];
                
                return (
                  <React.Fragment key={document.id}>
                    <ListItem>
                      <ListItemIcon>
                        {getFileIcon(document.file_info.file_type)}
                      </ListItemIcon>
                      
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="subtitle2">
                              {document.metadata.title}
                            </Typography>
                            <Chip 
                              label={docType.label} 
                              size="small" 
                              color={docType.color}
                              variant="outlined"
                            />
                            {document.verification.is_verified && (
                              <Chip 
                                icon={<Verified />} 
                                label="Verified" 
                                size="small" 
                                color="success"
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {document.metadata.description || 'No description'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {document.file_info.file_size_formatted} • 
                              Uploaded by {document.uploaded_by} • 
                              {new Date(document.upload_date).toLocaleDateString()}
                            </Typography>
                          </Box>
                        }
                      />
                      
                      <ListItemSecondaryAction>
                        <IconButton edge="end" size="small">
                          <Download />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                    {index < documents.length - 1 && <Divider />}
                  </React.Fragment>
                );
              })}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upload Activity Document</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Upload handwritten records, photos, or other proof documents for this activity.
              Supported formats: PDF, Word, PowerPoint, Images (JPG, PNG, etc.)
            </Alert>

            <Button
              variant="outlined"
              component="label"
              startIcon={<CloudUpload />}
              fullWidth
              sx={{ mb: 2, py: 2 }}
            >
              {selectedFile ? selectedFile.name : 'Choose File'}
              <input
                type="file"
                hidden
                accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.bmp"
                onChange={handleFileSelect}
              />
            </Button>

            {selectedFile && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </Alert>
            )}

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Document Type</InputLabel>
              <Select
                value={uploadData.document_type}
                onChange={(e) => setUploadData(prev => ({ ...prev, document_type: e.target.value }))}
                label="Document Type"
              >
                {Object.entries(DOCUMENT_TYPES).map(([key, value]) => (
                  <MenuItem key={key} value={key}>
                    <Box display="flex" alignItems="center" gap={1}>
                      {value.icon}
                      {value.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Document Title"
              value={uploadData.title}
              onChange={(e) => setUploadData(prev => ({ ...prev, title: e.target.value }))}
              sx={{ mb: 2 }}
              required
            />

            <TextField
              fullWidth
              multiline
              rows={2}
              label="Description (Optional)"
              value={uploadData.description}
              onChange={(e) => setUploadData(prev => ({ ...prev, description: e.target.value }))}
              sx={{ mb: 2 }}
            />

            <FormControl fullWidth>
              <InputLabel>Access Level</InputLabel>
              <Select
                value={uploadData.access_level}
                onChange={(e) => setUploadData(prev => ({ ...prev, access_level: e.target.value }))}
                label="Access Level"
              >
                <MenuItem value="GROUP">All Group Members</MenuItem>
                <MenuItem value="LEADERSHIP">Leadership Only</MenuItem>
                <MenuItem value="ADMIN">Admin Only</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleUpload} 
            variant="contained"
            disabled={!selectedFile || !uploadData.title.trim() || uploading}
          >
            {uploading ? 'Uploading...' : 'Upload Document'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
