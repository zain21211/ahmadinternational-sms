import React, { useState, useEffect, useCallback } from "react";
import TextInput from "./componets/Textfield";
import {
  Container,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Grid,
  Divider,
  Box,
  useTheme,
  FormControlLabel,
  Switch,
} from "@mui/material";
import { AddCircleOutline, DeleteOutline, Print, Edit, Visibility } from "@mui/icons-material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import axios from "axios";

// ... theme and productDetail constants remain unchanged ...

const InvoicePage = ({ initialInvoice, mode }) => {
  // ... existing state and logic remain unchanged ...

  return (
    <ThemeProvider theme={theme}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper elevation={3} sx={{ p: 2 }}>
          <Grid container justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Grid item sx={{ width: "20%" }}>
              <Typography variant="h5" fontWeight="bold" color="primary">
                INVOICE
              </Typography>
              <TextField
                size="small"
                label="Invoice Number"
                variant="outlined"
                value={invoice.number}
                onChange={handleInvoiceNumberChange}
                InputProps={{
                  readOnly: isReadOnly && mode === "view",
                }}
              />
            </Grid>
            <Grid item textAlign="center" sx={{ width: "33%" }}>
              <Typography variant="h4" fontWeight="bold">
                CARTO
              </Typography>
              <Typography variant="subtitle1">
                {getModeTitle()}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                size="small"
                label="Invoice Date"
                type="date"
                variant="outlined"
                InputLabelProps={{ shrink: true }}
                value={invoice.date}
                onChange={(e) => handleInvoiceDataChange("date", e.target.value)}
                InputProps={{
                  readOnly: isReadOnly && mode === "view",
                }}
                fullWidth
                sx={{
                  // Ensure sufficient width and proper rendering on mobile
                  minWidth: { xs: "160px", sm: "180px" }, // Fixed minWidth for date visibility
                  maxWidth: "100%", // Prevent overflow
                  "& input": {
                    fontSize: { xs: "0.875rem", sm: "1rem" }, // Smaller font on mobile
                    padding: { xs: "8px 10px", sm: "10px 12px" }, // Adjusted padding
                    width: "100%", // Ensure input uses full width
                    boxSizing: "border-box", // Prevent padding issues
                  },
                  "& .MuiInputBase-root": {
                    height: "40px", // Consistent height
                    paddingRight: { xs: "8px", sm: "10px" }, // Space for date picker icon
                  },
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": {
                      borderColor: "grey.400",
                    },
                  },
                }}
              />
            </Grid>
          </Grid>

          {/* ... rest of the component remains unchanged ... */}
        </Paper>
      </Container>
    </ThemeProvider>
  );
};

export default InvoicePage;