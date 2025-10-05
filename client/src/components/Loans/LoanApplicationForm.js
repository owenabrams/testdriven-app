import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Typography,
  Box,
  Alert,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
} from '@mui/material';
import { AccountBalance, CheckCircle, Warning } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { loansAPI } from '../../services/api';

const steps = ['Eligibility Check', 'Application Details', 'Review & Submit'];

export default function LoanApplicationForm({ 
  open, 
  onClose, 
  memberId, 
  groupId, 
  memberData 
}) {
  const [activeStep, setActiveStep] = useState(0);
  const [eligibilityResult, setEligibilityResult] = useState(null);
  const [loanAmount, setLoanAmount] = useState('');
  
  const { register, handleSubmit, formState: { errors }, watch, reset } = useForm();

  // Check loan eligibility
  const eligibilityMutation = useMutation(
    (data) => loansAPI.checkEligibility(groupId, memberId, data),
    {
      onSuccess: (response) => {
        if (response.data.status === 'success') {
          setEligibilityResult(response.data.data.eligibility);
          if (response.data.data.eligibility.eligible) {
            setActiveStep(1);
            console.log('You are eligible for a loan!');
          } else {
            console.log('Loan eligibility requirements not met');
          }
        }
      },
      onError: (error) => {
        console.error('Failed to check eligibility');
      }
    }
  );

  // Submit loan application
  const applicationMutation = useMutation(
    (data) => loansAPI.createAssessment(groupId, memberId, data),
    {
      onSuccess: (response) => {
        if (response.data.status === 'success') {
          console.log('Loan application submitted successfully!');
          handleClose();
        }
      },
      onError: (error) => {
        console.error('Failed to submit loan application');
      }
    }
  );

  const handleEligibilityCheck = () => {
    if (!loanAmount || parseFloat(loanAmount) <= 0) {
      console.error('Please enter a valid loan amount');
      return;
    }
    
    eligibilityMutation.mutate({
      loan_amount: parseFloat(loanAmount)
    });
  };

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const onSubmit = (data) => {
    const applicationData = {
      ...data,
      requested_amount: parseFloat(loanAmount),
      loan_amount: parseFloat(loanAmount)
    };
    
    if (activeStep === 2) {
      applicationMutation.mutate(applicationData);
    } else {
      handleNext();
    }
  };

  const handleClose = () => {
    setActiveStep(0);
    setEligibilityResult(null);
    setLoanAmount('');
    reset();
    onClose();
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Check Your Loan Eligibility
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Enter the loan amount you wish to apply for to check your eligibility.
            </Typography>
            
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  Your Financial Summary
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Total Savings"
                      secondary={`UGX ${memberData?.financialSummary?.totalSavings?.toLocaleString() || '0'}`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Estimated Eligibility"
                      secondary={`UGX ${memberData?.financialSummary?.loanEligibilityAmount?.toLocaleString() || '0'}`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Credit Score"
                      secondary={`${memberData?.financialSummary?.creditScore || 0}/100`}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>

            <TextField
              fullWidth
              label="Requested Loan Amount (UGX)"
              type="number"
              value={loanAmount}
              onChange={(e) => setLoanAmount(e.target.value)}
              sx={{ mb: 3 }}
              helperText="Enter the amount you wish to borrow"
            />

            {eligibilityResult && (
              <Alert 
                severity={eligibilityResult.eligible ? 'success' : 'warning'} 
                sx={{ mb: 2 }}
              >
                <Typography variant="body2">
                  {eligibilityResult.eligible 
                    ? `Great! You are eligible for a loan of UGX ${parseFloat(loanAmount).toLocaleString()}`
                    : 'You do not meet the eligibility requirements for this loan amount'
                  }
                </Typography>
                {eligibilityResult.reasons && eligibilityResult.reasons.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" display="block">
                      Reasons:
                    </Typography>
                    {eligibilityResult.reasons.map((reason, index) => (
                      <Typography key={index} variant="caption" display="block">
                        • {reason}
                      </Typography>
                    ))}
                  </Box>
                )}
              </Alert>
            )}

            <Button
              variant="contained"
              onClick={handleEligibilityCheck}
              disabled={eligibilityMutation.isLoading || !loanAmount}
              startIcon={eligibilityMutation.isLoading ? <CircularProgress size={20} /> : <CheckCircle />}
              fullWidth
            >
              {eligibilityMutation.isLoading ? 'Checking Eligibility...' : 'Check Eligibility'}
            </Button>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Loan Application Details
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Please provide the following information for your loan application.
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Loan Purpose"
                  {...register('purpose', { required: 'Loan purpose is required' })}
                  error={!!errors.purpose}
                  helperText={errors.purpose?.message}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Requested Term (Months)"
                  type="number"
                  {...register('requested_term_months', { 
                    required: 'Term is required',
                    min: { value: 1, message: 'Minimum 1 month' },
                    max: { value: 24, message: 'Maximum 24 months' }
                  })}
                  error={!!errors.requested_term_months}
                  helperText={errors.requested_term_months?.message}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Repayment Frequency</InputLabel>
                  <Select
                    {...register('repayment_frequency', { required: 'Repayment frequency is required' })}
                    error={!!errors.repayment_frequency}
                    label="Repayment Frequency"
                  >
                    <MenuItem value="WEEKLY">Weekly</MenuItem>
                    <MenuItem value="MONTHLY">Monthly</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Business Plan / Usage Description"
                  multiline
                  rows={4}
                  {...register('business_plan')}
                  helperText="Describe how you plan to use the loan and generate income"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Collateral Description (Optional)"
                  multiline
                  rows={2}
                  {...register('collateral_description')}
                  helperText="Describe any collateral you can provide"
                />
              </Grid>
            </Grid>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Review Your Application
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Please review your loan application details before submitting.
            </Typography>

            <Card>
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2">Loan Amount</Typography>
                    <Typography variant="body1">UGX {parseFloat(loanAmount).toLocaleString()}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2">Purpose</Typography>
                    <Typography variant="body1">{watch('purpose')}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2">Term</Typography>
                    <Typography variant="body1">{watch('requested_term_months')} months</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2">Repayment</Typography>
                    <Typography variant="body1">{watch('repayment_frequency')}</Typography>
                  </Grid>
                  {watch('business_plan') && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle2">Business Plan</Typography>
                      <Typography variant="body2">{watch('business_plan')}</Typography>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                Your application will be reviewed by the loan committee. You will be notified of the decision within 3-5 business days.
              </Typography>
            </Alert>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <AccountBalance color="primary" />
          <Typography variant="h6">
            Loan Application
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <form onSubmit={handleSubmit(onSubmit)}>
          {renderStepContent(activeStep)}
        </form>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>
          Cancel
        </Button>
        {activeStep > 0 && (
          <Button onClick={handleBack}>
            Back
          </Button>
        )}
        {activeStep === 0 && eligibilityResult?.eligible && (
          <Button variant="contained" onClick={handleNext}>
            Continue Application
          </Button>
        )}
        {activeStep > 0 && activeStep < 2 && (
          <Button variant="contained" onClick={handleSubmit(onSubmit)}>
            Next
          </Button>
        )}
        {activeStep === 2 && (
          <Button 
            variant="contained" 
            onClick={handleSubmit(onSubmit)}
            disabled={applicationMutation.isLoading}
            startIcon={applicationMutation.isLoading ? <CircularProgress size={20} /> : null}
          >
            {applicationMutation.isLoading ? 'Submitting...' : 'Submit Application'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
