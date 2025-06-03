import React, { useState, useEffect, useRef, Suspense } from "react";
const DataTable = React.lazy(() => import("./table"));
import { useParams } from "react-router-dom";
import TextInput from "./Textfield";
import {
  Container,
  Typography,
  TextField,
  // TextInput,
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
} from "@mui/material";

import {
  AddCircleOutline,
  DeleteOutline,
  Print,
  SignalCellularNull,
} from "@mui/icons-material";
import CircularProgress from "@mui/material/CircularProgress";
import Skeleton from "@mui/material/Skeleton";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import axios from "axios";

const theme = createTheme({
  palette: {
    primary: {
      main: "#2d3436",
    },
    secondary: {
      main: "#0984e3",
    },
  },
  typography: {
    fontFamily: "Poppins, Arial, sans-serif",
  },
});

const productDetail = [
  { label: "Product", size: 2, align: "left" },
  { label: "B.Q", size: 1 },
  { label: "FOC", size: 1 },
  { label: "T.Q", size: 1 },
  { label: "Price", size: 1 },
  { label: "D%", size: 1 },
  { label: "Amount", size: 2 },
];

const invoiceAPI = "http://100.122.80.93:3001/api/invoices";

const formatCurrency = (value) => {
  const num = Number(value);
  if (isNaN(num)) return "0"; // Returning "0" for NaN as requested
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

// invoice model
const BillingComponent = ({ name = "INVOICE" }) => {
  const [invoice, setInvoice] = useState({ items: [] });
  const [formData, setFormData] = useState([]);
  const [customer, setCustomer] = useState([]);
  const [products, setProducts] = useState([]);
  const [formattedDate, setFormattedDate] = useState("");
  const buttonRef = useRef(null);
  const { id } = useParams();
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser) : null;
  });

  useEffect(() => {
    // console.log("getting the invoice");
    const getInvoice = async () => {
      console.time("getting the invoice with # ", id);
      const response = await axios.get(`${invoiceAPI}/${id}`, {
        params: { user: user.username, type: user.userType },
      });

      console.log("invoice data:", response.data);
      await setInvoice(response.data);
      await setCustomer(response.data.Customer);
      await setProducts(response.data.Products);
      console.timeEnd("getting the invoice");
    };
    getInvoice();
  }, [id]);

  useEffect(() => {
    const now = new Date();
    const midnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0,
      0,
      0
    ); // Midnight tonight
    const timeUntilMidnight = midnight.getTime() - now.getTime();

    const timeoutId = setTimeout(() => {
      const newCurrentDate = new Date(); // Get updated current date to prevent date going stale
      const newYear = newCurrentDate.getFullYear();
      const newMonth = String(newCurrentDate.getMonth() + 1).padStart(2, "0");
      const newDay = String(newCurrentDate.getDate()).padStart(2, "0");
      setFormattedDate(`${newYear}-${newMonth}-${newDay}`);
    }, timeUntilMidnight);

    return () => clearTimeout(timeoutId); // Cleanup the timeout on unmount
  }, []); // Empty dependency array means this only runs once

  return (
    <ThemeProvider theme={theme}>
      <Container
        disableGutters
        maxWidth={false}
        sx={{ overflowX: "hidden", p: 0, m: 0 }}
      >
        <Paper elevation={3} sx={{ p: 0, m: 0, width: "100%" }}>
          <Grid
            container
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 0 }}
          >
            <Grid item sx={{ width: "15%" }}>
              <Typography variant="h5" fontWeight="bold" color="primary">
                {name}
              </Typography>
              <Typography variant="subtitle2" color="text.secondary">
                # {customer?.InvoiceNumber}
                {!customer?.InvoiceNumber && (
                  <Skeleton height={30} width="90%" />
                )}
              </Typography>
            </Grid>

            <Grid item xs={12} sx={{ width: { xs: "20%" } }}>
<TextField
  size="small"
  label="Date"
  InputLabelProps={{
    shrink: true,
    sx: {
      backgroundColor: "white",
    },
  }}
  value={
    customer?.InvoiceDate
      ? new Date(customer.InvoiceDate)
          .toLocaleDateString("en-GB")
          .replace(/\//g, "-")
      : ""
  }
  sx={{
    '& .MuiOutlinedInput-root': {
      border: "1px solid black",
      borderRadius: "1rem",
    },
    '& .MuiOutlinedInput-notchedOutline': {
      border: 'none', // optional: remove double-border effect
    },
    outline: "none", // This has no visible effect here
  }}
/>
            </Grid>
          </Grid>

          <Divider sx={{ mb: 1 }} />

          {/* Customer Details */}
          <Grid
            container
            spacing={1}
            justifyContent={"start"}
            display={"flex"}
            flexDirection={"row"}
            alignContent={"center"}
            sx={{ marginY: 4, width: "100%" }}
          >
            <Grid
              item
              xs={12}
              container
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography
                variant="h5"
                // fontWeight="bold"
                alignSelf="center"
              >
                <b>CUSTOMER NAME: </b>
                {customer?.CustomerName}
                {!customer?.CustomerName && (
                  <Skeleton height={30} width="90%" />
                )}
              </Typography>
            </Grid>
          </Grid>

          {/* Products List Table */}
          <Grid item xs={12} sx={{ marginTop: 3 }}>
            <Suspense
              fallback={
                <Box p={2}>
                  <Skeleton height={30} width="90%" />
                  <Skeleton height={30} width="70%" />
                  <Skeleton height={30} width="80%" />
                </Box>
              }
            >
              <DataTable
                data={products ?? []} // Ensure items is always an array
                columns={productDetail.map((field) => ({
                  id: field.label.toLowerCase(),
                  label: field.label,
                  align: "center",
                  width:
                    field.label === "Product"
                      ? "25%"
                      : field.label === "FOC"
                      ? "2%"
                      : field.label === "Price"
                      ? "10%"
                      : field.label === "Amount"
                      ? "5%"
                      : "5%", // Reduced Amount column width to 8%
                  minWidth: field.label === "Product" ? 178 : "5%", // Adjusted minimum width for Product column
                  render: (value, row) => {
                    let displayValue = "";
                    if (!row) <Skeleton height={30} width="80%" />;
                    if (field.label === "Product") {
                      displayValue = `${
                        row.Product?.toUpperCase() || "error"
                      } - ${row.Company?.toUpperCase() || ""}`;
                    } else if (field.label === "B.Q") {
                      displayValue = row.BQ || "0";
                    } else if (field.label === "FOC") {
                      displayValue = row.FOC || "0";
                    } else if (field.label === "T.Q") {
                      displayValue = row.TQ || "0";
                    } else if (field.label === "Price") {
                      displayValue = row.Price || "0";
                    } else if (field.label === "D%") {
                      displayValue = row.Disc2 || "0";
                    } else if (field.label === "Amount") {
                      displayValue = formatCurrency(row.Amount) || "0";
                    }

                    return (
                      <TextField
                        variant="standard"
                        value={displayValue}
                        type={
                          ["Quantity", "Price", "Discount"].includes(
                            field.label
                          )
                            ? "number"
                            : "text"
                        }
                        InputProps={{
                          disableUnderline: true,
                        }}
                        inputProps={{
                          style: {
                            padding: "0px",
                            textAlign:
                              field.label === "Product" ? "left" : "center",
                            fontSize:
                              field.label === "Product" ? ".8rem" : "0.8rem",
                            whiteSpace: "normal", // Enable text wrapping
                            wordWrap: "break-word", // Break long words
                          },
                        }}
                        sx={{
                          width: "100%",
                        }}
                      />
                    );
                  },
                }))}
                rowKey="id"
                apiEndpoint="invoices"
                sx={{
                  "& .MuiTableCell-root": {
                    border: "1px solid #ddd",
                    padding: ".25rem",
                    boxSizing: "border-box",
                  },
                  width: "100%",
                  tableLayout: "fixed",
                }}
              />
            </Suspense>
          </Grid>

          {/* Totals and Notes */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="h5" textAlign={"right"}>
              <strong>Total:</strong> {formatCurrency(customer.InvoiceAmount)}
            </Typography>
          </Box>

          {/* Notes Section */}
          <TextField
            label="Additional Notes"
            variant="outlined"
            InputLabelProps={{ shrink: true }}
            sx={{ marginY: 4 }}
            value={customer.Description}
            onChange={(e) =>
              setInvoice((prev) => ({
                ...prev,
                notes: e.target.value,
              }))
            }
          />

          {/* Print Button */}
          <Box textAlign="center" sx={{ mt: 4 }}>
            {/* <Button
              variant="contained"
              startIcon={<Print />}
              onClick={() => window.print()}
            >
              Print Invoice
            </Button> */}
            {/* <Button
              variant="contained"
              onClick={() => {
                handlePost();
              }}
              ref={buttonRef}
            >
              Submit
            </Button> */}
          </Box>
          {/* print Order Button */}
        <Box sx={{ mt: 3, textAlign: "center" }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
             onClick={window.print}
            // disabled={
            //   loading || // Disable during loading/posting
            //   initialDataLoading || // Disable during initial data fetch
            //   orderItems.length === 0 || // Cannot post empty order
            //   !selectedCustomer // Must have a selected customer
            // }
            sx={{ minWidth: "200px" }}
          >
                "Print"
            
          </Button>
        </Box>
        </Paper>
      </Container>
    </ThemeProvider>
  );
};

export default BillingComponent;
