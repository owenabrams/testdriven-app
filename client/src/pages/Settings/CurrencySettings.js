import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Alert,
  Divider,
  Chip,
} from '@mui/material';
import {
  AttachMoney,
  Settings,
  Save,
  Refresh,
} from '@mui/icons-material';
import { CURRENCY_SETTINGS, formatCurrency } from '../../utils/currency';

// Available currency options
const CURRENCY_OPTIONS = [
  { code: 'UGX', name: 'Ugandan Shilling', symbol: 'UGX', locale: 'en-UG' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KES', locale: 'en-KE' },
  { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TZS', locale: 'en-TZ' },
  { code: 'RWF', name: 'Rwandan Franc', symbol: 'RWF', locale: 'en-RW' },
  { code: 'USD', name: 'US Dollar', symbol: '$', locale: 'en-US' },
  { code: 'EUR', name: 'Euro', symbol: '€', locale: 'en-EU' },
  { code: 'GBP', name: 'British Pound', symbol: '£', locale: 'en-GB' },
];

export default function CurrencySettings() {
  const [settings, setSettings] = useState(CURRENCY_SETTINGS);
  const [saved, setSaved] = useState(false);

  const handleCurrencyChange = (field, value) => {
    if (field === 'code') {
      // When currency code changes, update related fields
      const currency = CURRENCY_OPTIONS.find(c => c.code === value);
      if (currency) {
        setSettings({
          ...settings,
          code: currency.code,
          symbol: currency.symbol,
          name: currency.name,
          locale: currency.locale,
        });
      }
    } else {
      setSettings({
        ...settings,
        [field]: value,
      });
    }
    setSaved(false);
  };

  const handleSave = () => {
    // In a real application, this would save to backend/localStorage
    console.log('Saving currency settings:', settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    setSettings(CURRENCY_SETTINGS);
    setSaved(false);
  };

  const sampleAmount = 1234567.89;

  return (
    <Box>
      {/* Header */}
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <Settings color="primary" />
        <Typography variant="h4">Currency Settings</Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Current Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <AttachMoney /> Current Currency Configuration
              </Typography>
              
              <Box mb={3}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Currency</InputLabel>
                  <Select
                    value={settings.code}
                    label="Currency"
                    onChange={(e) => handleCurrencyChange('code', e.target.value)}
                  >
                    {CURRENCY_OPTIONS.map((currency) => (
                      <MenuItem key={currency.code} value={currency.code}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Chip label={currency.symbol} size="small" />
                          {currency.name} ({currency.code})
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  margin="normal"
                  label="Currency Symbol"
                  value={settings.symbol}
                  onChange={(e) => handleCurrencyChange('symbol', e.target.value)}
                />

                <TextField
                  fullWidth
                  margin="normal"
                  label="Currency Name"
                  value={settings.name}
                  onChange={(e) => handleCurrencyChange('name', e.target.value)}
                />

                <TextField
                  fullWidth
                  margin="normal"
                  label="Locale"
                  value={settings.locale}
                  onChange={(e) => handleCurrencyChange('locale', e.target.value)}
                  helperText="Used for number formatting (e.g., en-UG, en-US)"
                />

                <TextField
                  fullWidth
                  margin="normal"
                  label="Minimum Decimal Places"
                  type="number"
                  value={settings.minimumFractionDigits}
                  onChange={(e) => handleCurrencyChange('minimumFractionDigits', parseInt(e.target.value))}
                  inputProps={{ min: 0, max: 4 }}
                />

                <TextField
                  fullWidth
                  margin="normal"
                  label="Maximum Decimal Places"
                  type="number"
                  value={settings.maximumFractionDigits}
                  onChange={(e) => handleCurrencyChange('maximumFractionDigits', parseInt(e.target.value))}
                  inputProps={{ min: 0, max: 4 }}
                />
              </Box>

              <Box display="flex" gap={2}>
                <Button
                  variant="contained"
                  startIcon={<Save />}
                  onClick={handleSave}
                  color="primary"
                >
                  Save Settings
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={handleReset}
                >
                  Reset to Default
                </Button>
              </Box>

              {saved && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  Currency settings saved successfully!
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Preview */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Currency Preview
              </Typography>
              
              <Box mb={2}>
                <Typography variant="body2" color="text.secondary">
                  Sample Amount: {sampleAmount}
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box mb={2}>
                <Typography variant="subtitle1" gutterBottom>
                  Formatted Display:
                </Typography>
                <Typography variant="h4" color="primary">
                  {formatCurrency(sampleAmount)}
                </Typography>
              </Box>

              <Box mb={2}>
                <Typography variant="subtitle1" gutterBottom>
                  Current Settings:
                </Typography>
                <Box display="flex" flexDirection="column" gap={1}>
                  <Chip label={`Code: ${settings.code}`} variant="outlined" />
                  <Chip label={`Symbol: ${settings.symbol}`} variant="outlined" />
                  <Chip label={`Name: ${settings.name}`} variant="outlined" />
                  <Chip label={`Locale: ${settings.locale}`} variant="outlined" />
                  <Chip label={`Decimals: ${settings.minimumFractionDigits}-${settings.maximumFractionDigits}`} variant="outlined" />
                </Box>
              </Box>

              <Alert severity="info">
                <Typography variant="body2">
                  This currency format will be used throughout the application for:
                  <br />• Meeting financial summaries
                  <br />• Loan amounts and payments
                  <br />• Savings and contributions
                  <br />• Reports and analytics
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
