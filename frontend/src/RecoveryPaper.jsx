import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react"; // Added useMemo
import axios from "axios"; // Not used in this version
import LedgerSearchForm from "./CustomerSearch";
import { useLocalStorageState } from "./hooks/LocalStorage"; // Assuming this path
import {useRealOnlineStatus} from  './hooks/IsOnlineHook'
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";

// Import MUI Components
import {
  Box,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Alert,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  Stack,
  Container,
} from "@mui/material";

const url = "http://100.122.80.93:3001/api"; // Update with your actual API URL

const LabelWithImage = ({ src, label }) => (
  <Box display="flex" alignItems="center" gap={1}>
    <img
      src={src}
      alt={label}
      width={label === "CASH"? 60: 30}
      height={label === "CASH"? 35:30}
      style={{ objectFit: "contain" }} // Example border, adjust as needed
    />
    <span>{label}</span>
  </Box>
);

// MODIFIED formatCurrency function
const formatCurrency = (value) => {
  // Input `value` is expected to be a raw numeric string (e.g., "12345"), an actual number, or an empty string.
  if (value === "" || value === null || value === undefined) {
    return ""; // Return empty string for empty/null/undefined input
  }

  // Convert to string, remove any existing commas (e.g. if a raw value like "1,234" was somehow passed, or for general robustness)
  const rawNumericString = String(value).replace(/,/g, '');
  
  // If rawNumericString becomes empty after stripping (e.g. value was just ","), treat as empty.
  if (rawNumericString.trim() === "") {
      return "";
  }

  const num = Number(rawNumericString);

  if (isNaN(num)) {
    // If, after stripping potential commas, it's still not a number,
    // it means the input 'value' was something like "abc" or non-numeric.
    // Return "" to clear invalid input in a TextField.
    return "";
  }

  // Format to 0 decimal places and use toLocaleString for thousands separators.
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

const textBoxStyle = {
   fontSize: '1.2rem',         // Increases font size of input text

  '& .MuiInputBase-input': {
    textAlign: 'right',        // Ensures input text is left-aligned
    fontSize: '1.5rem',       // Also set inside to affect the real input
    paddingY: '12px',         // Optional: increase vertical padding
  },
  '& .MuiInputLabel-root': {
    fontSize: '1rem',         // Optional: label size
  },
  '& .MuiOutlinedInput-root': {
    height: '60px',           // Optional: makes the whole TextField taller
  },
}

const RecoveryPaper = () => {
  // State variables using useLocalStorageState for persistence
  const [route, setRoute] = useLocalStorageState("recoveryPaperRoute", "");
  const [accountID, setAccountID] = useLocalStorageState(
    "recoveryPaperAccountID",
    ""
  );
  const [entries, setEntries] = useLocalStorageState(
    "recoveryPaperEntries",
    []
  );
  const [customerInput, setCustomerInput] = useLocalStorageState(
    "recoverpaperCustomerInput",
    ""
  );

  // State variables for each payment method amount will store raw numeric strings (e.g., "12345")
  const [cashAmount, setCashAmount] = useLocalStorageState(
    "recoveryPaperCashAmount",
    ""
  );
  const [jazzcashAmount, setJazzcashAmount] = useLocalStorageState(
    "recoveryPaperJazzcashAmount",
    ""
  );
  const [easypaisaAmount, setEasypaisaAmount] = useLocalStorageState(
    "recoveryPaperEasypaisaAmount",
    ""
  );
  const [crownWalletAmount, setCrownWalletAmount] = useLocalStorageState(
    "recoveryPaperCrownWalletAmount",
    ""
  );
  const [meezanBankAmount, setMeezanBankAmount] = useLocalStorageState(
    "recoveryPaperMeezanBankAmount",
    ""
  );
  const [balance, setBalance] = useLocalStorageState(
    "recoveryBalance",
    ""
  );const [remainingBalance, setRemainingBalance] = useLocalStorageState(
    "recoveryRemainingBalance",
    ""
  );

  const user = JSON.parse(localStorage.getItem("user"));

  const [customerName, setCustomerName] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [totalAmount, setTotalAmount] = useState(0); 
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [acidInput, setAcidInput] = useState(accountID); 

  const [totalCash, setTotalCash] = useState(0);
  const [totalJazzcash, setTotalJazzcash] = useState(0);
  const [totalEasypaisa, setTotalEasypaisa] = useState(0);
  const [totalCrownWallet, setTotalCrownWallet] = useState(0);
  const [totalMeezanBank, setTotalMeezanBank] = useState(0);
const [loading, setLoading] = useState(false)
  const cashInputRef = useRef(null);
  const acidInputRef = useRef(null);
  // const [isOnline, setIsOnline] = useState(navigator.onLine);

  const isOnline = useRealOnlineStatus();

  // useEffect(() => {
  //   const handleOnline = () => setIsOnline(true);
  //   const handleOffline = () => setIsOnline(false);
  //   window.addEventListener('online', handleOnline);
  //   window.addEventListener('offline', handleOffline);
  //   return () => {
  //     window.removeEventListener('online', handleOnline);
  //     window.removeEventListener('offline', handleOffline);
  //   };
  // }, []);

  useEffect(() => {
    // Simplified effect based on original logic, assuming accountID drives customer data fetching
    if (accountID) {
      setIsLoading(false); // Assuming actual fetch logic is handled by LedgerSearchForm or not shown
      setCustomerName(""); // Reset based on original pattern
      setError("");
    } else {
      setCustomerName("");
      setIsLoading(false);
      setError("");
    }
  }, [accountID]);

 useEffect(() => {

  const cleanNumber = (val) => Number(val?.toString().replace(/[^0-9.-]+/g, "")) || 0;

  const numericBalance = cleanNumber(balance) || 0;
  const numericCash = cleanNumber(cashAmount) || 0;
  const numericJazzcash = cleanNumber(jazzcashAmount) || 0;
  const numericMeezan = cleanNumber(meezanBankAmount) || 0;
  const numericCrown = cleanNumber(crownWalletAmount) || 0;
  const numericEasy = cleanNumber(easypaisaAmount) || 0;

  const totalAmount = numericBalance - (numericCash + numericJazzcash + numericMeezan + numericCrown+ numericEasy);

  console.log("The total amount is", totalAmount);

  setRemainingBalance(formatCurrency(Math.round(totalAmount)));
}, [balance, cashAmount, jazzcashAmount, meezanBankAmount, crownWalletAmount, easypaisaAmount]);


  const handleReset = useCallback(() => {
    setAccountID("");
  }, [setAccountID]);

  const handleFetchData = useCallback(
    (customer) => {
      console.log("recovery received selected customer:", customer);
      setSelectedCustomer(customer);
      setAccountID(customer ? customer.acid : "");
      if (customer) {
        cashInputRef.current?.focus();
      }
    },
    [setAccountID]
  );

    useEffect(() => {
    const fetchCustomerFinancials = async () => {
      if (!selectedCustomer || !selectedCustomer.acid) {
        console.log("No customer selected for financial fetch.");
        setBalance(null);
        // setOverDue(null);
        return;
      }

      setLoading(true); // Set loading specifically for this fetch
      setError(null); // Clear previous errors

      try {
        // Assuming balance API takes acid and date (YYYY-MM-DD format)
        const responseBal = await axios.get(`${url}/balance`, {
          params: {
            acid: selectedCustomer.acid,
            date: new Date(), // selectedDate is already YYYY-MM-DD
          },
          // headers: { Authorization: `Bearer ${token}` }, // Add token
        });
        console.log("Customer balance response:", responseBal.data);
        const { balance } = responseBal.data;
        console.log("THE BALACE IS ", balance)
        setBalance(formatCurrency(Math.round(balance)));
        // setBalance(balance)

        // // Assuming overdue API takes acid and date (YYYY-MM-DD format)
        // const responseOver = await axios.get(
        //   `${API_BASE_URL}/balance/overdue`,
        //   {
        //     params: {
        //       acid: selectedCustomer.acid,
        //       date: selectedDate, // selectedDate is already YYYY-MM-DD
        //     },
        //     headers: { Authorization: `Bearer ${token}` }, // Add token
        //   }
        // );

        // console.log("Customer overdue response:", responseOver.data);
    //     const { overDue } = responseOver.data;
    //     setOverDue(formatCurrency(Math.round(overDue)));
    //   } catch (err) {
    //     console.error("Error fetching customer financials:", err);
    //     setError(
    //       `Failed to load customer financials. ${
    //         err.response?.data?.message || err.message
    //       }`
    //     );
        // setBalance(null);
    //     setOverDue(null);
      } finally {
    //     // Only turn off loading if *this* fetch is complete
    //     // Be careful if other operations also set 'loading'
        setLoading(false);
      }
    };

    // Fetch whenever selectedCustomer or selectedDate changes
    fetchCustomerFinancials();
  }, [selectedCustomer]); // Added dependencies

  
  useEffect(() => {
    setAcidInput(accountID);
  }, [accountID]);

   useEffect(() => {
    console.log("the new balance ", balance)
  }, [balance]);

    // Debounced update of accountID
  useEffect(() => {
    const timeout = setTimeout(() => {
      setAccountID(acidInput);
    }, 900); // 900ms delay

    return () => clearTimeout(timeout); // Cleanup on new input
  }, [acidInput]);

  useEffect(() => {
    let overallTotal = 0;
    let cashTotal = 0;
    let jazzcashTotal = 0;
    let easypaisaTotal = 0;
    let crownWalletTotal = 0;
    let meezanBankTotal = 0;

    entries.forEach((entry) => {
      overallTotal += entry.entryTotal || 0;
      cashTotal += entry.amounts?.cash || 0;
      jazzcashTotal += entry.amounts?.jazzcash || 0;
      easypaisaTotal += entry.amounts?.easypaisa || 0;
      crownWalletTotal += entry.amounts?.crownWallet || 0;
      meezanBankTotal += entry.amounts?.meezanBank || 0;
    });

    setTotalAmount(overallTotal);
    setTotalCash(cashTotal);
    setTotalJazzcash(jazzcashTotal);
    setTotalEasypaisa(easypaisaTotal);
    setTotalCrownWallet(crownWalletTotal);
    setTotalMeezanBank(meezanBankTotal);
  }, [entries]);

  // MODIFIED Generic amount change handler factory
  const createAmountChangeHandler = (setter) => (event) => {
    const inputValue = event.target.value;
    // Remove all non-digit characters to get the raw number string.
    // Allows empty string as well.
    const numericString = inputValue.replace(/\D/g, ""); 
    setter(numericString); // Update state with the unformatted (raw) number string
  };

  // This function is not directly used by the amount TextFields in the JSX provided.
  // Left as is per instructions, but would need changes if wired up to the new system.
  const handleAmountBlur = (value, setter) => {
    if (value !== "") {
      // Original logic: setter(formatCurrency(Number(value).toFixed(0)));
      // This line would put a formatted string into the state which is not intended with the new setup.
      // For the requested changes, this function's current state is not impacting the amount fields.
      setter(formatCurrency(Number(value).toFixed(0))); // Kept original line for fidelity to "no other changes"
    }
  };

  const handleCashAmountChange = createAmountChangeHandler(setCashAmount);
  const handleJazzcashAmountChange = createAmountChangeHandler(setJazzcashAmount);
  const handleEasypaisaAmountChange = createAmountChangeHandler(setEasypaisaAmount);
  const handleCrownWalletAmountChange = createAmountChangeHandler(setCrownWalletAmount);
  const handleMeezanBankAmountChange = createAmountChangeHandler(setMeezanBankAmount);

  const handleAddEntry =async () => {
    // cashAmount, etc., are raw numeric strings like "12345" or ""
    const parsedCash = parseFloat(cashAmount) || 0;
    const parsedJazzcash = parseFloat(jazzcashAmount) || 0;
    const parsedEasypaisa = parseFloat(easypaisaAmount) || 0;
    const parsedCrownWallet = parseFloat(crownWalletAmount) || 0;
    const parsedMeezanBank = parseFloat(meezanBankAmount) || 0;

    const currentEntryTotal =
      parsedCash +
      parsedJazzcash +
      parsedEasypaisa +
      parsedCrownWallet +
      parsedMeezanBank;

    if (!accountID) {
      alert("Please enter an Account ID.");
      return;
    }
     // Customer name check logic based on original
    if (!selectedCustomer && !customerName) { // Adjusted to check selectedCustomer first
      if (isLoading) {
         alert("Please wait for the customer name to load.");
      } else {
         alert("Invalid Account ID or customer not selected. Customer name not found.");
      }
      return;
    }


    if (currentEntryTotal <= 0) {
      alert(
        "Please enter a valid positive amount for at least one payment method."
      );
      return;
    }

    const newEntry = {
      id: accountID,
      name: selectedCustomer ? selectedCustomer.name : customerName,
      amounts: {
        cash: parsedCash,
        jazzcash: parsedJazzcash,
        easypaisa: parsedEasypaisa,
        crownWallet: parsedCrownWallet,
        meezanBank: parsedMeezanBank,
      },
      userName: user?.username || "Unknown User",
      entryTotal: currentEntryTotal,
      timestamp: new Date().toISOString(),
      status: false
    };
    setIsLoading(true)
    if (isOnline){
    try {
      let success = false;
      
       success =  await makeCashEntry(newEntry);
    
      if (success) {
        newEntry.status = true;
      }else {
        console.log("Failed to post entry, saving locally.");
      }

      setEntries((prevEntries) => [...prevEntries, newEntry]);
      console.log("Entry added successfully:", newEntry);
    } catch (error) {
      console.error("Failed to save entry:", error);
      setEntries((prevEntries) => [...prevEntries, newEntry]); // Save locally on error
    }
    }else{
      setEntries((prevEntries) => [...prevEntries, newEntry]); // Save locally on error
    }
    setIsLoading(false)

    setCashAmount("");
    setJazzcashAmount("");
    setEasypaisaAmount("");
    setCrownWalletAmount("");
    setMeezanBankAmount("");

    setRoute(""); // Reset route after adding entry
    setAccountID("");
    setCustomerName("");
    setCustomerInput(''); 
    setSelectedCustomer(null);
    acidInputRef?.current?.focus();

    console.log("Entry added, resetting input fields. the customer input is:", customerName);
    // Consider focusing logic, e.g., back to account ID input or LedgerSearchForm
  };


 const makeCashEntry = async (entry) => {
  try {
    const { amounts, id, userName } = entry;
    const entriesToPost = Object.entries(amounts).filter(([_, amount]) => amount !== 0);

    if (entriesToPost.length === 0) {
      console.log(`No entries to post for customer ${id}`);
      return true; // Nothing to post, treated as success
    }

    let status = true;


    for (const [method, amount] of entriesToPost) {
      const payload = {
        paymentMethod: method === 'crownWallet' ? 'crownone' : method === 'meezanBank'? 'mbl' : method, // Adjusted for API compatibility
        custId: id,
        receivedAmount: amount,
        userName,
      };


      try {
        const response = await axios.post(`${url}/cash-entry`, payload);

        if (response.status !== 200) {
          console.error(`❌ Failed to post ${method} for customer ${id}:`, response.statusText);
          status = false;
        }
      } catch (error) {
        console.error(`❌ Error posting ${method} for customer ${id}:`, error.response?.data || error.message);
        status = false;
      }
    }

    return status;

  } catch (error) {
    console.error('❌ Unexpected error posting entries:', error.message);
    return false;
  }
};

const handleSyncEntries = async (entry) => {
 const success = await makeCashEntry(entry);
         if (success) {
    setEntries(prevEntries =>
      prevEntries.map(e =>
        e.id === entry.id ? { ...e, status: true } : e
      )
    );
  }
        console.log(`Entry ${entry.id} sync status: ${entry.status ? "✅" : "❌"}`);
      }

useEffect(() => {
  if (!isOnline) return;

  const unsyncedEntries = entries.filter((entry) => !entry.status);

  if (unsyncedEntries.length === 0) return;

  const syncEntries = async () => {
    const updatedEntries = await Promise.all(
      entries.map(async (entry) => {
        if (!entry.status) {
          const success = await makeCashEntry(entry);
          if (success) {
            return { ...entry, status: true };
          }
        }
        return entry;
      })
    );

    setEntries(updatedEntries);
  };

  syncEntries();
  // 🔒 dependencies do NOT include `entries` directly to avoid loop
}, [isOnline]);



  const handleEnter = (e) => {
    if (e.key === "Enter" || e.key === "Tab") {
      setAccountID(e.target.value); // Update accountID which triggers customer fetch/validation
      // Clearing these might be desired, or handled by accountID effect
      setCustomerInput(""); 
      setCustomerName("");
      setSelectedCustomer(null); 
    }
  };

  const isAddEntryDisabled = useMemo(() => {
    const parsedCash = parseFloat(cashAmount) || 0;
    const parsedJazzcash = parseFloat(jazzcashAmount) || 0;
    const parsedEasypaisa = parseFloat(easypaisaAmount) || 0;
    const parsedCrownWallet = parseFloat(crownWalletAmount) || 0;
    const parsedMeezanBank = parseFloat(meezanBankAmount) || 0;
    const currentEntryTotal =
      parsedCash +
      parsedJazzcash +
      parsedEasypaisa +
      parsedCrownWallet +
      parsedMeezanBank;

    return (
      !accountID ||
      (!selectedCustomer && !customerName) || // Condition from original code
      isLoading ||
      currentEntryTotal <= 0
    );
  }, [
    accountID,
    selectedCustomer,
    customerName,
    isLoading,
    cashAmount,
    jazzcashAmount,
    easypaisaAmount,
    crownWalletAmount,
    meezanBankAmount,
  ]);

  return (
    <Container
      maxWidth="sm"
      sx={{
        border: "1px solid #ccc",
        borderRadius: 2,
        bgcolor: "#fff",
        paddingBottom: 2, // Added padding for PAID button visibility
      }}
    >
       <Box
      sx={{
        backgroundColor: isOnline ? "#e0f7fa" : "#ffebee",
        color: isOnline ? "#006064" : "#b71c1c",
        padding: 2,
        borderRadius: 1,
        mb: 3,
      }}
    >
      <Typography variant="h6" component="h1" gutterBottom>
        {isOnline ? "Online Mode" : "Offline Mode"}
      </Typography>
     
    </Box>

      <Box
        display={"grid"}
        justifyContent={"center"}
        gridTemplateColumns={{ xs: "repeat(3, 1fr)", md: "repeat(3, 1fr)" }}
        alignItems={"center"}
        gap={2}
        mb={3}
      >
        <Typography
          variant="h5"
          component="h2"
          gutterBottom
          textAlign="start"
          sx={{ gridColumn: { xs: "span 2", md: "1" }, fontWeight:"bold" }}
        >
          Recovery Entry
        </Typography>
        <TextField
          label="Route"
          variant="outlined"
          margin="normal"
          onFocus={(e) => e.target.select()}
          value={route} 
          onChange={(e) => {
            setRoute(e.target.value);
            setAccountID(""); 
            setSelectedCustomer(null); 
            setCustomerName(""); 
            setCustomerInput("");
          }}
          sx={{ gridColumn: { xs: "span 1", md: "1" }, fontWeight: "bold" }} 
          inputProps={{ style: { textTransform: "uppercase", fontWeight:"bold" } }} 
        />
      </Box>

      <Stack spacing={2} sx={{ mb: 3 }}>
        <Box sx={{ mb: 2 }}>
          <Box
            sx={{
              textAlign: "center",
              mb: 2,
              display: "grid",
              gridTemplateColumns: { xs: "repeat(3, 1fr)", sm: "1fr 3fr" }, // Adjusted for small screens
              gap: 2,
              alignItems: "center",
            }}
          >
             <TextField
      label="Customer Account ID"
      variant="outlined"
      fullWidth
      inputRef={acidInputRef}
      onFocus={(e) => e.target.select()}
      value={acidInput}
      onChange={(e) => setAcidInput(e.target.value)}
      onKeyDown={handleEnter}
      inputProps={{ inputMode: "numeric" }}
    />
            <Box sx={{ gridColumn: { xs: "span 2", md: "2" } }}>
              <LedgerSearchForm
                usage={"recovery"}
                onSelect={handleFetchData}
                ID={accountID}
                route={route}
                onReset={handleReset}
              />
            </Box>
          </Box>
          {accountID && (
          <Box sx={{ minHeight: "3em" }}>
            {isLoading && (
              <Typography
                variant="body2"
                color="text.secondary"
                display="flex"
                alignItems="center"
                gap={1}
              >
                <CircularProgress size={16} /> Loading customer...
              </Typography>
            )}
            {error && !isLoading && <Alert severity="error">{error}</Alert>}
            {!isLoading && !error && selectedCustomer && (
              <>
                <Typography variant="h6" gutterBottom sx={{ mb: 1 }}> {/* Reduced margin */}
                  Name: <strong>{selectedCustomer.name}</strong>
                </Typography>
                {selectedCustomer.UrduName && (
                  <Typography variant="h4"> {/* Consider adjusting size if too large */}
                    <strong>{selectedCustomer.UrduName}</strong>
                  </Typography>
                )}
              </>
            )}
           {/* Show BALANCE and REMAINING BALANCE once */}
  <Box display="grid" gridTemplateColumns="repeat(4, 1fr)" alignItems={"center"} gap={2} mt={2}>
            <TextField
            label="description"
            sx={{gridColumn:{xs:"span 2"}}}
            />
{balance !== null && (
        
  <Box display="grid" gridTemplateColumns="repeat(2, 1fr)" gridColumn="span 2" alignItems={"center"} gap={2}>
    <TextField
      label="Balance"
      type="string"
      value={balance}
      disabled
      onFocus={(e) => e.target.select()}
      InputLabelProps={{ shrink: true }}
      sx={{
        gridColumn:{xs:"span 1"},
        width: { xs: "100%", sm: "150px" },
        "& .Mui-disabled": {
          fontWeight: "bold",
          textAlign: "right",
          WebkitTextFillColor: "black !important",
        },
      }}
    />
    <TextField
      label="Remaining"
      type="string"
      value={remainingBalance}
      disabled
      onFocus={(e) => e.target.select()}
      InputLabelProps={{ shrink: true }}
      sx={{
        width: { xs: "100%", sm: "150px" },
        "& .Mui-disabled": {
          fontWeight: "bold",
          textAlign: "right",
          WebkitTextFillColor: "black !important",
        },
      }}
    />
  </Box>
  )}
  </Box>

          </Box>
          )}
        </Box>

        <Box
          sx={{
            textAlign: "center",
            mb: 2,
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(3, 1fr)", // Single column on extra small screens
              sm: "repeat(2, 1fr)", // Two columns on small screens
              md: "repeat(3, 1fr)", // Three columns on medium and up
            },
            gap: 2,
            alignItems: "center",
          }}
        >
          <TextField
            label={ <LabelWithImage src="/icons/cash.png" label="CASH" /> }
            variant="outlined"
            onFocus={(e) => e.target.select()}
            fullWidth
            value={formatCurrency(cashAmount)} // MODIFIED: Display formatted value
            onChange={handleCashAmountChange}
            inputProps={{ inputMode: "tel" }} // "tel" for numeric keypad, allows formatting chars
            inputRef={cashInputRef}
            sx={textBoxStyle}
          />
          <TextField
            label={ <LabelWithImage src="/icons/jazzcash.png" label="JAZZCASH" /> }
            variant="outlined"
            fullWidth
            onFocus={(e) => e.target.select()}
            value={formatCurrency(jazzcashAmount)} // MODIFIED
            onChange={handleJazzcashAmountChange} 
            inputProps={{ inputMode: "tel" }}
            sx={textBoxStyle}
          />
          <TextField
            label={ <LabelWithImage src="/icons/easypaisa.png" label="EASYPAISA" /> }
            variant="outlined"
            onFocus={(e) => e.target.select()}
            fullWidth
            value={formatCurrency(easypaisaAmount)} // MODIFIED
            onChange={handleEasypaisaAmountChange} 
            inputProps={{ inputMode: "tel" }}
            sx={textBoxStyle}
          />
          <TextField
            label={ <LabelWithImage src="/icons/crownwallet.png" label="CROWN WALLET" /> }
            variant="outlined"
            onFocus={(e) => e.target.select()}
            fullWidth
            value={formatCurrency(crownWalletAmount)} // MODIFIED
            onChange={handleCrownWalletAmountChange}
            inputProps={{ inputMode: "tel" }}
            sx={textBoxStyle}
          />
          <TextField
            label={ <LabelWithImage src="/icons/meezanbank.png" label="MEEZAN BANK" /> }
            variant="outlined"
            onFocus={(e) => e.target.select()}
            fullWidth
            value={formatCurrency(meezanBankAmount)} // MODIFIED
            onChange={handleMeezanBankAmountChange} 
            inputProps={{ inputMode: "tel" }}
            sx={textBoxStyle}
          />
           <TextField
            label ="other"
            variant="outlined"
            onFocus={(e) => e.target.select()}
            fullWidth
            disabled
            // value={...} // No value binding as it's disabled and not part of formatting
            // onChange={...}
            inputProps={{ inputMode: "decimal" }} // Kept as "decimal" from original
            sx={textBoxStyle}
          />
        </Box>
        <Button
          variant="contained"
          fullWidth
          onClick={handleAddEntry}
          disabled={isAddEntryDisabled}
          sx={{
          fontSize: "1.5rem",
          }}
        >
          Add Entry
        </Button>
      </Stack>

      <Box
        sx={{ mt: 3, pt: 2, borderTop: "1px solid #eee", textAlign: "right" }}
      >
      

      <Box sx={{ mt: 1, textAlign: "right" }}>
        {totalCash > 0 && (
          <Typography variant="h4"sx={{fontWeight:'bold'} }>
            Total Cash: <strong>{formatCurrency(totalCash.toFixed(0))}</strong>
          </Typography>
        )}
        {totalJazzcash > 0 && (
          <Typography variant="body1">
            Total Jazzcash: <strong>{formatCurrency(totalJazzcash.toFixed(0))}</strong>
          </Typography>
        )}
        {totalEasypaisa > 0 && (
          <Typography variant="body1">
            Total Easypaisa: <strong>{formatCurrency(totalEasypaisa.toFixed(0))}</strong>
          </Typography>
        )}
        {totalCrownWallet > 0 && (
          <Typography variant="body1">
            Total Crown Wallet: <strong>{formatCurrency(totalCrownWallet.toFixed(0))}</strong>
          </Typography>
        )}
        {totalMeezanBank > 0 && (
          <Typography variant="body1">
            Total Meezan Bank: <strong>{formatCurrency(totalMeezanBank.toFixed(0))}</strong>
          </Typography>
        )}
      </Box>
      <Typography variant="h6" gutterBottom>
        Overall Total Received: <strong>{formatCurrency(totalAmount.toFixed(0))}</strong>
      </Typography>
    </Box>

      <Typography variant="h6" component="h3" gutterBottom sx={{ mt:2 }}>
        Entries:
      </Typography>

      {entries.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No entries added yet.
        </Typography>
      ) : (
        <List sx={{ bgcolor: "background.paper", p: 0, maxHeight: '300px', overflowY: 'auto' }}> {/* Added scroll for long lists */}
          {entries.slice().reverse().map((entry, index) => {
            const reversedIndex = entries.length - index;
            const amountDetails = [];
            if (entry.amounts?.cash > 0)
              amountDetails.push(`Cash: ${formatCurrency(entry.amounts.cash.toFixed(0))}`);
            if (entry.amounts?.jazzcash > 0)
              amountDetails.push(`Jazzcash: ${formatCurrency(entry.amounts.jazzcash.toFixed(0))}`);
            if (entry.amounts?.easypaisa > 0)
              amountDetails.push(`Easypaisa: ${formatCurrency(entry.amounts.easypaisa.toFixed(0))}`);
            if (entry.amounts?.crownWallet > 0)
              amountDetails.push(`Crown Wallet: ${formatCurrency(entry.amounts.crownWallet.toFixed(0))}`);
            if (entry.amounts?.meezanBank > 0)
              amountDetails.push(`Meezan Bank: ${formatCurrency(entry.amounts.meezanBank.toFixed(0))}`);

            return (
              <ListItem
                key={`${entry.timestamp}-${index}-${entry.id}`} // Improved key
                divider={index < entries.length - 1}
                onClick={() => {
                  if (entry.status === false)
                    handleSyncEntries(entry)
                  }}
                sx={{
                  paddingY: "4px", // Adjusted padding
                  paddingX: "0px",
                  "&:hover": {
                    backgroundColor: "#f5f5f5",
                  },
                }}
              >
                <ListItemText
                
                  primary={`${reversedIndex}. ${entry.name} (${entry.id}) - ${entry.status ? "✅" : "❌"}`} // Added ID to primary for clarity
                  secondary={
                    amountDetails.length > 0
                      ? `${amountDetails.join(", ")}  |    Total: ${formatCurrency(entry?.entryTotal?.toFixed(0))}`
                      : `Total: ${formatCurrency(entry?.entryTotal?.toFixed(0))}`
                  }
                  primaryTypographyProps={{
                    fontWeight: "bold",
                    fontSize: "1.1rem" // Adjusted font size
                  }}
                  secondaryTypographyProps={{
                    fontSize: "1rem" // Adjusted font size
                  }}
                />
              </ListItem>
            );
          })}
        </List>
      )}

      <Button
        variant="contained"
        fullWidth
        disabled={!isOnline} // Disable if offline
        sx={{
          mt: 2,
          fontSize: "1.5rem",
          backgroundColor: "red",
          color: "#fff",
          "&:hover": {
            backgroundColor: "darkred", // Darker red on hover
            // color: "black", // Original hover color
          },
        }}
        onClick={() => {
          // Placeholder for PAID functionality
          // alert("PAID button clicked. Implement finalization logic here (e.g., clear all entries, sync final state).");
          setEntries([]); // This would clear entries.
        }}
      >
          PAID
      </Button>
    </Container>
  );
};

export default RecoveryPaper;