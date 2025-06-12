import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import axios from "axios";
import LedgerSearchForm from "./CustomerSearch";
import { useLocalStorageState } from "./hooks/LocalStorage";
import { useRealOnlineStatus } from "./hooks/IsOnlineHook";
// import AttachMoneyIcon from "@mui/icons-material/AttachMoney"; // Not used in this version

// Import MUI Components
import {
  Box,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Alert,
  // InputAdornment, // Not used in this version
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
      width={label === "CASH" ? 60 : 30}
      height={label === "CASH" ? 35 : 30}
      style={{ objectFit: "contain" }}
    />
    <span>{label}</span>
  </Box>
);
const KNOWN_EXPENSE_METHODS = [
  "petrol",
  "entertainment",
  "bilty",
  "toll",
  "repair",
];
const expenseLabelMap = {
  petrol: "Petrol",
  toll: "Toll",
  repair: "Repair",
  entertainment: "Entertainment",
  bilty: "Bilty",
};

const formatCurrency = (value) => {
  if (value === "" || value === null || value === undefined) {
    return "";
  }
  const rawNumericString = String(value).replace(/,/g, "");
  if (rawNumericString.trim() === "") {
    return "";
  }
  const num = Number(rawNumericString);
  if (isNaN(num)) {
    return "";
  }
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

const textBoxStyle = {
  fontSize: "1.2rem",
  "& .MuiInputBase-input": {
    textAlign: "right",
    fontSize: "1.5rem",
    paddingY: "12px",
  },
  "& .MuiInputLabel-root": {
    fontSize: "1rem",
  },
  "& .MuiOutlinedInput-root": {
    height: "60px",
  },
};

const RecoveryPaper = () => {
  const [route, setRoute] = useLocalStorageState("recoveryPaperRoute", "");
  const [accountID, setAccountID] = useLocalStorageState(
    "recoveryPaperAccountID",
    ""
  );
  const [entries, setEntries] = useLocalStorageState(
    "recoveryPaperEntries",
    []
  );
  const [customerInput, setCustomerInput] = useLocalStorageState( // Keep for potential future use or if LedgerSearchForm uses it
    "recoverpaperCustomerInput",
    ""
  );

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
  const [balance, setBalance] = useLocalStorageState("recoveryBalance", "");
  const [remainingBalance, setRemainingBalance] = useLocalStorageState(
    "recoveryRemainingBalance",
    ""
  );

  const user = JSON.parse(localStorage.getItem("user"));

  const [customerName, setCustomerName] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  
  // These will now store NET values (after expenses)
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalCash, setTotalCash] = useState(0);

  const [isLoading, setIsLoading] = useState(false); // General loading
  const [error, setError] = useState("");
  const [acidInput, setAcidInput] = useState(accountID);
  const [loadingFinancials, setLoadingFinancials] = useState(false);
  const [detailedResults, setDetailedResults] = useState([]);


  // Totals for individual payment methods (these are gross from entries)
  const [totalJazzcash, setTotalJazzcash] = useState(0);
  const [totalEasypaisa, setTotalEasypaisa] = useState(0);
  const [totalCrownWallet, setTotalCrownWallet] = useState(0);
   const [submissionStatus, setSubmissionStatus] = useState({ message: '', type: '' }); // 'success' or 'error'
  const [totalMeezanBank, setTotalMeezanBank] = useState(0);

  // Expense inputs
  const [petrolExpense, setPetrolExpense] = useLocalStorageState("recoveryPetrolExpenseVal", "");
  const [tollExpense, setTollExpense] = useLocalStorageState("recoveryTollExpenseVal", "");
  const [repairExpense, setRepairExpense] = useLocalStorageState("recoveryRepairExpenseVal", "");
  const [entertainmentExpense, setEntertainmentExpense] = useLocalStorageState("recoveryEntertainmentExpenseVal", "");
  const [biltyExpense, setBiltyExpense] = useLocalStorageState("recoveryBiltyExpenseVal", "");
  // These will store the calculated total expenses
  
  // Calculated total expenses
  const [currentTotalExpenses, setCurrentTotalExpenses] = useState(0);

  // Temporary states for gross calculation before applying expenses
  const [grossCashFromEntries, setGrossCashFromEntries] = useState(0);
  const [grossAmountFromEntries, setGrossAmountFromEntries] = useState(0);

const expenseStateMap = {
  petrol: { value: petrolExpense, setter: setPetrolExpense },
  toll: { value: tollExpense, setter: setTollExpense },
  repair: { value: repairExpense, setter: setRepairExpense },
  entertainment: { value: entertainmentExpense, setter: setEntertainmentExpense },
  bilty: { value: biltyExpense, setter: setBiltyExpense },
};

  const cashInputRef = useRef(null);
  const acidInputRef = useRef(null);
  const isOnline = useRealOnlineStatus();

  const isOperator = user.userType.toLowerCase().includes("operator");

const expenseKeys = isOperator
  ? ["entertainment", "bilty", "repair"]
  : ["petrol", "toll", "repair"];

  
  const handleSubmitExpenses = async () => {
    setIsLoading(true);
    setSubmissionStatus({ message: '', type: '' });
    setDetailedResults([]);

    const amounts = {};
    if (parseFloat(petrolExpense) > 0) amounts.petrol = parseFloat(petrolExpense);
    if (parseFloat(tollExpense) > 0) amounts.toll = parseFloat(tollExpense);
    if (parseFloat(repairExpense) > 0) amounts.repair = parseFloat(repairExpense);
    if (parseFloat(entertainmentExpense) > 0) amounts.entertainment = parseFloat(entertainmentExpense);
    if (parseFloat(biltyExpense) > 0) amounts.bilty = parseFloat(biltyExpense);


    if (Object.keys(amounts).length === 0) {
      setSubmissionStatus({ message: "No expenses entered to submit.", type: 'info' });
      setIsLoading(false);
      return;
    }


    const entryData = {
      custId: 1, // Make sure custId is passed as a prop or retrieved from context/state
      userName: user.username,   // Make sure userName is passed
      userType: user.userType,   // Make sure userType is passed
      amounts,
    };

    console.log("Submitting expenses with entryData:", entryData);
    const response = await makeExpenseEntry(entryData);

    setIsLoading(false);
    setSubmissionStatus({
      message: response.message || (response.success ? "Expenses submitted successfully!" : "Error submitting expenses."),
      type: response.success ? 'success' : 'error',
    });
    setDetailedResults(response.results || []);

    if (response.success) {
      // Optionally reset fields
      setPetrolExpense('');
      setTollExpense('');
      setRepairExpense('');
      setEntertainmentExpense('');
      setBiltyExpense('');
      setCurrentTotalExpenses(0); // Reset total expenses after successful submission
    }
  };

  useEffect(() => {
    if (accountID) {
      setIsLoading(false); // General loading for entry, not customer fetch
      // setCustomerName(""); // Don't reset customerName here if selectedCustomer will set it
      setError("");
    } else {
      // Reset customer specific data when accountID is cleared
      setCustomerName("");
      setSelectedCustomer(null);
      setBalance("");
      setRemainingBalance("");
      setIsLoading(false);
      setError("");
    }
  }, [accountID]);

  useEffect(() => {
    const cleanNumber = (val) =>
      Number(String(val).replace(/[^0-9.-]+/g, "")) || 0;

    const numericBalance = cleanNumber(balance) || 0;
    const numericCash = cleanNumber(cashAmount) || 0;
    const numericJazzcash = cleanNumber(jazzcashAmount) || 0;
    const numericMeezan = cleanNumber(meezanBankAmount) || 0;
    const numericCrown = cleanNumber(crownWalletAmount) || 0;
    const numericEasy = cleanNumber(easypaisaAmount) || 0;

    const currentEntryPaymentTotal =
      numericCash +
      numericJazzcash +
      numericMeezan +
      numericCrown +
      numericEasy;

    const newRemainingBalance = numericBalance - currentEntryPaymentTotal;
    setRemainingBalance(formatCurrency(Math.round(newRemainingBalance)));
  }, [
    balance,
    cashAmount,
    jazzcashAmount,
    meezanBankAmount,
    crownWalletAmount,
    easypaisaAmount,
  ]);

  const handleReset = useCallback(() => {
    setAccountID(""); // This will trigger the useEffect above to clear other customer states
    // No need to call setSelectedCustomer, setCustomerName, etc., here directly
    // as the accountID effect handles it.
    setAcidInput(""); // Also clear the visual input
  }, [setAccountID]);

  const handleFetchData = useCallback(
    (customer) => {
      setSelectedCustomer(customer);
      setAccountID(customer ? customer.acid : ""); // This triggers other effects
      setCustomerName(customer ? customer.name : ""); // Set name immediately for display
      if (customer) {
        cashInputRef.current?.focus();
      } else { // If customer is null (e.g. search found nothing or reset)
        setBalance("");
        setRemainingBalance("");
      }
    },
    [setAccountID]
  );
  
  // 1. Calculate GROSS totals from 'entries' AND sum of individual payment methods
  useEffect(() => {
    let overallTotal = 0;
    let cashOnlyTotal = 0;
    let jazzcashTotal = 0;
    let easypaisaTotal = 0;
    let crownWalletTotal = 0;
    let meezanBankTotal = 0;

    entries.forEach((entry) => {
      overallTotal += entry.entryTotal || 0;
      cashOnlyTotal += entry.amounts?.cash || 0;
      jazzcashTotal += entry.amounts?.jazzcash || 0;
      easypaisaTotal += entry.amounts?.easypaisa || 0;
      crownWalletTotal += entry.amounts?.crownWallet || 0;
      meezanBankTotal += entry.amounts?.meezanBank || 0;
    });

    setGrossAmountFromEntries(overallTotal);
    setGrossCashFromEntries(cashOnlyTotal);
    setTotalJazzcash(jazzcashTotal);
    setTotalEasypaisa(easypaisaTotal);
    setTotalCrownWallet(crownWalletTotal);
    setTotalMeezanBank(meezanBankTotal);
  }, [entries]);

  // 2. Calculate TOTAL expenses from individual expense inputs
  useEffect(() => {
    const cleanNumber = (val) =>
      Number(String(val).replace(/[^0-9.-]+/g, "")) || 0;
    const petrol = cleanNumber(petrolExpense);
    const toll = cleanNumber(tollExpense);
    const repair = cleanNumber(repairExpense);
    const entertainment = cleanNumber(entertainmentExpense);
    const bilty = cleanNumber(biltyExpense);

    const calculatedTotalExpenses = petrol + toll + repair + entertainment + bilty;
    setCurrentTotalExpenses(calculatedTotalExpenses);
  }, [petrolExpense, tollExpense, repairExpense, entertainmentExpense, biltyExpense]);

  // 3. Calculate NET totalCash and totalAmount
  useEffect(() => {
    const netCash = grossCashFromEntries - currentTotalExpenses;
    const netAmount = grossAmountFromEntries - currentTotalExpenses;

    setTotalCash(netCash);
    setTotalAmount(netAmount);
  }, [grossCashFromEntries, grossAmountFromEntries, currentTotalExpenses]);


  useEffect(() => {
    const fetchCustomerFinancials = async () => {
      if (!selectedCustomer || !selectedCustomer.acid) {
        // If no selected customer, or selected customer has no acid, clear balance
        // This might happen if handleFetchData is called with null
        setBalance("");
        return;
      }
      setLoadingFinancials(true);
      setError(null); // Clear previous errors specific to this fetch
      try {
        const responseBal = await axios.get(`${url}/balance`, {
          params: {
            acid: selectedCustomer.acid,
            date: new Date().toISOString().split("T")[0],
          },
        });
        const { balance: fetchedBalance } = responseBal.data;
        setBalance(formatCurrency(Math.round(fetchedBalance)));
      } catch (err) {
        setError(`Balance fetch error: ${err.response?.data?.message || err.message}`);
        setBalance(""); // Clear balance on error
      } finally {
        setLoadingFinancials(false);
      }
    };

    if (selectedCustomer && selectedCustomer.acid) { // Condition to fetch
        fetchCustomerFinancials();
    } else {
        // If there's no valid selectedCustomer to fetch for, ensure balance is cleared.
        // This handles cases where selectedCustomer becomes null or loses its acid.
        setBalance("");
        setRemainingBalance(""); // Also clear remaining as it depends on balance
    }
  }, [selectedCustomer]); // Only re-run when selectedCustomer object changes

  useEffect(() => {
    setAcidInput(accountID); // Sync visual input when accountID changes (e.g. from search)
  }, [accountID]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if(acidInput !== accountID) {
        setAccountID(acidInput); // Update internal accountID from manual input (triggers customer search)
      }
    }, 900);
    return () => clearTimeout(timeout);
  }, [acidInput, accountID, setAccountID]);


  const createAmountChangeHandler = (setter) => (event) => {
    const inputValue = event.target.value;
    const numericString = inputValue.replace(/\D/g, "");
    setter(numericString);
  };

  const handleCashAmountChange = createAmountChangeHandler(setCashAmount);
  const handleJazzcashAmountChange = createAmountChangeHandler(setJazzcashAmount);
  const handleEasypaisaAmountChange = createAmountChangeHandler(setEasypaisaAmount);
  const handleCrownWalletAmountChange = createAmountChangeHandler(setCrownWalletAmount);
  const handleMeezanBankAmountChange = createAmountChangeHandler(setMeezanBankAmount);

  const handleAddEntry = async () => {
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
      alert("Please enter or select an Account ID.");
      acidInputRef.current?.focus();
      return;
    }
    if (!selectedCustomer) {
      alert("Customer not selected. Please verify the Account ID or search again.");
      return;
    }
    if (currentEntryTotal <= 0) {
      alert("Please enter a valid positive amount for at least one payment method.");
      cashInputRef.current?.focus();
      return;
    }

    const newEntry = {
      id: accountID,
      name: selectedCustomer.name,
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
      status: false,
    };
    
    setIsLoading(true);
    let entrySuccessfullyPostedOnline = false;

    if (isOnline) {
      try {
        entrySuccessfullyPostedOnline = await makeCashEntry(newEntry);
        newEntry.status = entrySuccessfullyPostedOnline;
      } catch (apiError) {
        newEntry.status = false;
      }
    }
    
    setEntries((prevEntries) => [...prevEntries, newEntry]);
    setIsLoading(false);

    setCashAmount("");
    setJazzcashAmount("");
    setEasypaisaAmount("");
    setCrownWalletAmount("");
    setMeezanBankAmount("");
    setSelectedCustomer("")
    setAcidInput("")
    setAccountID("")
    
    // Reset customer specific fields for next entry
    handleReset(); // Use the reset handler
    // setAccountID(""); // Not needed, handleReset does it
    // setSelectedCustomer(null);
    // setCustomerName("");
    // setBalance("");
    // setRemainingBalance("");
    // setRoute(""); // Decide if route should be reset

    acidInputRef.current?.focus();
  };

  const makeCashEntry = async (entry) => {
    try {
      const { amounts, id: custId, userName } = entry;
      const entriesToPost = Object.entries(amounts).filter(
        ([_, amount]) => amount > 0
      );

      if (entriesToPost.length === 0) return true; 

      let allSubEntriesSuccessful = true;
      for (const [method, amount] of entriesToPost) {
        const payload = {
          paymentMethod:
            method === "crownWallet" ? "crownone" : method === "meezanBank" ? "mbl" : method,
          custId,
          receivedAmount: amount,
          userName,
        };
        try {
          const response = await axios.post(`${url}/cash-entry`, payload);
          if (response.status !== 200 && response.status !== 201) {
            allSubEntriesSuccessful = false;
          }
        } catch (error) {
          allSubEntriesSuccessful = false;
        }
      }
      return allSubEntriesSuccessful;
    } catch (error) {
      return false;
    }
  };
  const makeExpenseEntry = async (entry) => {
  try {
    const { amounts, custId: custId, userName, userType } = entry;

    console.log("makeExpenseEntry called with:", { amounts, custId, userName, userType });

    if (!amounts || typeof amounts !== 'object' || Object.keys(amounts).length === 0) {
      return { success: true, results: [], message: "No amounts to process." };
    }
    if (!custId || !userName) {
        return { success: false, results: [], message: "Missing custId or userName." };
    }

    // Filter out entries with zero or invalid amounts
    const entriesToPost = Object.entries(amounts).filter(
      ([_methodKey, amount]) => typeof amount === 'number' && amount > 0
    );

    if (entriesToPost.length === 0) {
      return { success: true, results: [], message: "No valid entries with amount > 0 to post." };
    }

    const operationResults = [];
    let allSubEntriesSuccessful = true;

    for (const [methodKey, amount] of entriesToPost) {
      const lowerMethodKey = methodKey.toLowerCase();
      let payload = {
        custId,
        receivedAmount: amount,
        userName,
        userType, // Pass userType; the API will use it if needed
        // You might want to pass the date from the frontend if it's user-selectable
        // date: new Date().toISOString(),
      };

      if (KNOWN_EXPENSE_METHODS.includes(lowerMethodKey)) {
        payload.expenseMethod = lowerMethodKey;
      } else {
        if (lowerMethodKey === "crownwallet") {
          payload.paymentMethod = "crownone";
        } else if (lowerMethodKey === "meezanbank") {
          payload.paymentMethod = "mbl";
        } else {
          payload.paymentMethod = lowerMethodKey;
        }
      }

      try {
        console.log("Posting to /cash-entry with payload:", payload);
        const response = await axios.post(`${url}/cash-entry`, payload);

        if (response.status === 200 || response.status === 201) {
          operationResults.push({
            methodKey,
            success: true,
            data: response.data,
          });
        } else {
          // This case might not be hit often if axios throws for non-2xx statuses by default
          allSubEntriesSuccessful = false;
          operationResults.push({
            methodKey,
            success: false,
            error: `API Error: Status ${response.status}`,
            data: response.data,
          });
        }
      } catch (error) {
        allSubEntriesSuccessful = false;
        let errorMessage = "An unknown error occurred.";
        if (axios.isAxiosError(error)) {
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                errorMessage = error.response.data?.error || error.response.data?.message || `Server Error: ${error.response.status}`;
                console.error(`API Error for ${methodKey}:`, error.response.data);
                operationResults.push({
                    methodKey,
                    success: false,
                    error: errorMessage,
                    data: error.response.data,
                });
            } else if (error.request) {
                // The request was made but no response was received
                errorMessage = "Network Error: No response received from server.";
                console.error(`Network Error for ${methodKey}:`, error.request);
                operationResults.push({ methodKey, success: false, error: errorMessage });
            } else {
                // Something happened in setting up the request that triggered an Error
                errorMessage = `Request Setup Error: ${error.message}`;
                console.error(`Request Setup Error for ${methodKey}:`, error.message);
                operationResults.push({ methodKey, success: false, error: errorMessage });
            }
        } else {
             // Non-Axios error
             console.error(`Error processing ${methodKey}:`, error);
             operationResults.push({ methodKey, success: false, error: error.message || "An unexpected error occurred." });
        }
      }
    }

    return {
      success: allSubEntriesSuccessful,
      results: operationResults,
      message: allSubEntriesSuccessful ? "All entries processed." : "Some entries failed.",
    };

  } catch (error) {
    // Catch errors from destructuring or initial setup
    console.error("Critical error in makeExpenseEntry:", error);
    return {
      success: false,
      results: [],
      message: error.message || "A critical error occurred while preparing entries.",
    };
  }}

  const handleSyncOneEntry = useCallback(async (entryToSync) => {
    if (!isOnline) {
      alert("Cannot sync while offline.");
      return;
    }
    const success = await makeCashEntry(entryToSync);
    if (success) {
      setEntries((prevEntries) =>
        prevEntries.map((e) =>
          e.timestamp === entryToSync.timestamp && e.id === entryToSync.id
            ? { ...e, status: true }
            : e
        )
      );
    } else {
      alert(`Failed to sync entry for ${entryToSync.name}.`);
    }
  }, [isOnline, setEntries]);

  useEffect(() => {
    if (!isOnline) return;
    const unsyncedEntries = entries.filter((entry) => !entry.status);
    if (unsyncedEntries.length === 0) return;

    const syncAll = async () => {
      let madeChanges = false;
      const updatedEntries = await Promise.all(
        entries.map(async (entry) => {
          if (!entry.status) {
            const success = await makeCashEntry(entry);
            if (success) {
              madeChanges = true;
              return { ...entry, status: true };
            }
          }
          return entry;
        })
      );
      if (madeChanges) {
        setEntries(updatedEntries);
      }
    };
    syncAll();
  }, [isOnline, entries, setEntries]);

  const handleEnterOnAcid = (e) => {
    if (e.key === "Enter" || e.key === "Tab") {
      // Debounce will handle setAccountID from acidInput
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
      !selectedCustomer ||
      isLoading ||
      loadingFinancials ||
      currentEntryTotal <= 0
    );
  }, [
    accountID,
    selectedCustomer,
    isLoading,
    loadingFinancials,
    cashAmount,
    jazzcashAmount,
    easypaisaAmount,
    crownWalletAmount,
    meezanBankAmount,
  ]);

  const handlePaidAndResetAll = () => {
    if (window.confirm("Are you sure you want to clear all entries and reset the form? Unsynced entries might be lost if not posted.")) {
      setEntries([]);
      setRoute("");
      handleReset(); // Use the main reset for customer/account ID
      setCashAmount("");
      setJazzcashAmount("");
      setEasypaisaAmount("");
      setCrownWalletAmount("");
      setMeezanBankAmount("");
      setPetrolExpense("");
      setTollExpense("");
      setRepairExpense("");
      acidInputRef.current?.focus();
    }
  };

  return (
    <Container
      maxWidth="sm"
      sx={{
        border: "1px solid #ccc",
        borderRadius: 2,
        bgcolor: "#fff",
        paddingBottom: 2,
      }}
    >
      <Box
        sx={{
          backgroundColor: isOnline ? "#e0f7fa" : "#ffebee",
          color: isOnline ? "#006064" : "#b71c1c",
          padding: 2,
          borderRadius: 1,
          mb: 3,
          textAlign: 'center',
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
          sx={{ gridColumn: { xs: "span 2", md: "1" }, fontWeight: "bold" }}
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
            setRoute(e.target.value.toUpperCase());
            handleReset();
          }}
          sx={{ gridColumn: { xs: "span 1", md: "1" }, fontWeight: "bold" }}
          inputProps={{
            style: { textTransform: "uppercase", fontWeight: "bold" },
          }}
        />
      </Box>

      <Stack spacing={2} sx={{ mb: 3 }}>
        <Box sx={{ mb: 2 }}>
          <Box
            sx={{
              textAlign: "center",
              mb: 2,
              display: "grid",
              gridTemplateColumns: { xs: "repeat(3, 1fr)", sm: "1fr 2fr" },
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
              onKeyDown={handleEnterOnAcid}
              inputProps={{ inputMode: "numeric" }}
            />
            <Box
            sx={{ gridColumn: { xs: "span 2", sm: "1" }}}
            >
            <LedgerSearchForm
              usage={"recovery"}
              onSelect={handleFetchData}
              ID={accountID}
              route={route}
              onReset={handleReset}

            />
            </Box>
          </Box>
          {/* Customer Details Section */}
          {accountID && (
            <Box sx={{ minHeight: "3em", border: "1px solid #eee", p: 1, borderRadius: 1, mt: 1 }}>
              {(isLoading || loadingFinancials) && !error && (
                <Typography variant="body2" color="text.secondary" display="flex" alignItems="center" gap={1}>
                  <CircularProgress size={16} /> Loading customer...
                </Typography>
              )}
              {error && !isLoading && <Alert severity="error" sx={{ fontSize: '0.9rem', py: 0.5 }}>{error}</Alert>}
              
              {!isLoading && !error && selectedCustomer && (
                <>
                  <Typography variant="h6" gutterBottom sx={{ mb: 0.5, fontSize: '1.1rem', fontWeight: 'bold' }}>
                    Name: <strong>{selectedCustomer.name}</strong>
                  </Typography>
                  {selectedCustomer.UrduName && (
                    <Typography variant="h4" sx={{ fontSize: '1.4rem', fontWeight: 'bold' }}>
                      <strong>{selectedCustomer.UrduName}</strong>
                    </Typography>
                  )}
                </>
              )}
              {!isLoading && !error && !selectedCustomer && accountID && (
                 <Typography variant="body2" color="textSecondary">Enter valid Account ID or search.</Typography>
              )}

              {/* This Box now correctly wraps Description, Balance, and Remaining for layout as per original */}
              <Box
                display="grid"
                gridTemplateColumns="repeat(6, 1fr)" // Original: 4 columns
                alignItems={"center"}
                gap={2}
                mt={2}
              >
                <TextField
                  label="Description" // Original: "description"
                  sx={{ gridColumn: { xs: "span 2", sm: "span 2" } }} // Adjusted to span appropriately
                  size="small"
                />
                {/* Conditional rendering for Balance and Remaining as a group */}
                {(balance !== null && balance !== "") && (selectedCustomer) && ( // Also check for selectedCustomer
                  <Box
                    display="grid"
                    gridTemplateColumns="repeat(2, 1fr)"
                    gridColumn={{xs: "span 4", sm: "span 2"}} // This Box takes the remaining space
                    alignItems={"center"}
                    gap={2}
                  >
                    <TextField
                      label="Balance"
                      type="text"
                      value={balance}
                      disabled
                      size="small"
                      InputLabelProps={{ shrink: true }}
                      sx={{
                        "& .MuiInputBase-input.Mui-disabled": {
                          fontWeight: "bold", textAlign: "right", WebkitTextFillColor: "red !important", fontSize: "1.5rem"
                        },
                      }}
                    />
                    <TextField
                      label="Remaining"
                      type="text"
                      value={remainingBalance}
                      disabled
                      size="small"
                      InputLabelProps={{ shrink: true }}
                      sx={{
                        "& .MuiInputBase-input.Mui-disabled": {
                          fontWeight: "bold", textAlign: "right", WebkitTextFillColor: "green !important", fontSize: "1.5rem"
                        },
                      }}
                    />
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </Box>

        {/* Payment Method Inputs */}
        <Box
          sx={{
            textAlign: "center",
            mb: 2,
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(3, 1fr)",
              sm: "repeat(3, 1fr)",
            },
            gap: 1.5,
            alignItems: "center",
          }}
        >
          <TextField
            label={<LabelWithImage src="/icons/cash.png" label="CASH" />}
            variant="outlined"
            onFocus={(e) => e.target.select()}
            fullWidth
            value={formatCurrency(cashAmount)}
            onChange={handleCashAmountChange}
            inputProps={{ inputMode: "tel" }}
            inputRef={cashInputRef}
            sx={textBoxStyle}
          />
          <TextField
            label={<LabelWithImage src="/icons/jazzcash.png" label="JAZZCASH" />}
            variant="outlined"
            fullWidth
            onFocus={(e) => e.target.select()}
            value={formatCurrency(jazzcashAmount)}
            onChange={handleJazzcashAmountChange}
            inputProps={{ inputMode: "tel" }}
            sx={textBoxStyle}
          />
          <TextField
            label={<LabelWithImage src="/icons/easypaisa.png" label="EASYPAISA" />}
            variant="outlined"
            onFocus={(e) => e.target.select()}
            fullWidth
            value={formatCurrency(easypaisaAmount)}
            onChange={handleEasypaisaAmountChange}
            inputProps={{ inputMode: "tel" }}
            sx={textBoxStyle}
          />
          <TextField
            label={<LabelWithImage src="/icons/crownwallet.png" label="CROWN WALLET"/>}
            variant="outlined"
            onFocus={(e) => e.target.select()}
            fullWidth
            value={formatCurrency(crownWalletAmount)}
            onChange={handleCrownWalletAmountChange}
            inputProps={{ inputMode: "tel" }}
            sx={textBoxStyle}
          />
          <TextField
            label={<LabelWithImage src="/icons/meezanbank.png" label="MEEZAN BANK" />}
            variant="outlined"
            onFocus={(e) => e.target.select()}
            fullWidth
            value={formatCurrency(meezanBankAmount)}
            onChange={handleMeezanBankAmountChange}
            inputProps={{ inputMode: "tel" }}
            sx={textBoxStyle}
          />
          <TextField
            label="Other"
            variant="outlined"
            onFocus={(e) => e.target.select()}
            fullWidth
            disabled
            inputProps={{ inputMode: "decimal" }}
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
            padding: "10px 0"
          }}
        >
          Add Entry
        </Button>
      </Stack>

      {/* Totals Display Section - totalCash and totalAmount are NET */}
      <Box
        sx={{ mt: 3, pt: 2, borderTop: "1px solid #eee", textAlign: "right" }}
      >
        <Box sx={{ mt: 1, textAlign: "right" }}>
          {totalCash !== 0 && ( // Show net cash if not zero
            <Typography variant="h4" sx={{ fontWeight: "bold" }}>
              Net Cash:{" "}
              <strong>{formatCurrency(totalCash.toFixed(0))}</strong>
            </Typography>
          )}
          {/* Other payment methods are still shown as gross totals from entries */}
          {totalJazzcash > 0 && (
            <Typography variant="body1">
              Total Jazzcash: {" "}
              <strong>{formatCurrency(totalJazzcash.toFixed(0))}</strong>
            </Typography>
          )}
          {totalEasypaisa > 0 && (
            <Typography variant="body1">
              Total Easypaisa: {" "}
              <strong>{formatCurrency(totalEasypaisa.toFixed(0))}</strong>
            </Typography>
          )}
          {totalCrownWallet > 0 && (
            <Typography variant="body1">
              Total Crown Wallet: {" "}
              <strong>{formatCurrency(totalCrownWallet.toFixed(0))}</strong>
            </Typography>
          )}
          {totalMeezanBank > 0 && (
            <Typography variant="body1">
              Total Meezan Bank: {" "}
              <strong>{formatCurrency(totalMeezanBank.toFixed(0))}</strong>
            </Typography>
          )}
        </Box>
        <Typography variant="h6" gutterBottom>
          Net Overall Total Received: {" "}
          <strong>{formatCurrency(totalAmount.toFixed(0))}</strong>
        </Typography>
      </Box>

      <Typography variant="h6" component="h3" gutterBottom sx={{ mt: 2 }}>
        Entries ({entries.length}):
      </Typography>
      {entries.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No entries added yet.
        </Typography>
      ) : (
        <List
          sx={{
            bgcolor: "background.paper", p: 0, maxHeight: "auto",
            overflowY: "auto", overflowX: "hidden", border: "1px solid #ddd", borderRadius: 1,
          }}
        >
          {entries.slice().reverse().map((entry, index) => {
              const reversedIndex = entries.length - index;
              const amountDetails = [];
              if (entry.amounts?.cash > 0) amountDetails.push(`Cash: ${formatCurrency(entry.amounts.cash.toFixed(0))}`);
              if (entry.amounts?.jazzcash > 0) amountDetails.push(`Jazzcash: ${formatCurrency(entry.amounts.jazzcash.toFixed(0))}`);
              if (entry.amounts?.easypaisa > 0) amountDetails.push(`Easypaisa: ${formatCurrency(entry.amounts.easypaisa.toFixed(0))}`);
              if (entry.amounts?.crownWallet > 0) amountDetails.push(`Crown Wallet: ${formatCurrency(entry.amounts.crownWallet.toFixed(0))}`);
              if (entry.amounts?.meezanBank > 0) amountDetails.push(`Meezan Bank: ${formatCurrency(entry.amounts.meezanBank.toFixed(0))}`);

              return (
                <ListItem
                  key={`${entry.timestamp}-${entry.id}-${index}`}
                  divider={index < entries.length - 1}
                  onClick={() => { if (!entry.status) handleSyncOneEntry(entry); }}
                  sx={{
                    paddingY: "6px", paddingX: "8px", cursor: entry.status ? "default" : "pointer",
                    "&:hover": { backgroundColor: entry.status ? "#f5f5f5" : "#fffde7" },
                  }}
                >
                  <ListItemText
                    primary={`${reversedIndex}. ${entry.name} (${entry.id})`}
                    secondary={
                      amountDetails.length > 0
                        ? `${amountDetails.join(" | ")}  |    Total: ${formatCurrency(entry.entryTotal?.toFixed(0))}`
                        : `Total: ${formatCurrency(entry.entryTotal?.toFixed(0))}`
                    }
                    primaryTypographyProps={{ fontWeight: "bold", fontSize: "1rem" }}
                    secondaryTypographyProps={{ fontSize: "0.9rem", color: "text.secondary" }}
                  />
                   <Typography variant="caption" sx={{ ml:1, fontWeight:'bold', color: entry.status ? 'green' : 'orange'}}>
                      {entry.status ? "Synced ✅" : "Pending ⏳"}
                   </Typography>
                </ListItem>
              );
            })}
        </List>
      )}

      {/* Expenses section */}
      `{!user.userType.toLowerCase().includes("classic") && (
      <Box sx={(theme) => ({
    mt: 4,
    backgroundColor: theme.palette.error.main,
    color: theme.palette.error.contrastText,
    fontWeight: "bold",
    p: 2,
    borderRadius: 3,
  })}
      >

        <Typography variant="h5" gutterBottom>
         <b> Total Expenses: {formatCurrency(currentTotalExpenses.toFixed(0))}</b>
        </Typography>
        <Box
          display="grid"
          gridTemplateColumns={{xs:"repeat(3, 1fr)", sm:"repeat(3, 1fr)"}}
          gap={2}
          alignItems="center"
          mb={2}
        >
        {expenseKeys.map((key) => {
  const { value, setter } = expenseStateMap[key];
  return (
    <TextField
      key={key}
      label={expenseLabelMap[key] || key}
      variant="outlined"
      fullWidth
      size="small"
       InputLabelProps={{
    sx: {
      fontWeight: 'bold',
      fontSize: '1.3rem'
    }
  }}

      value={formatCurrency(value)}
      onChange={(e) => setter(e.target.value.replace(/\D/g, ""))}
      inputProps={{ inputMode: "tel" }}
      onFocus={(e) => e.target.select()}
      sx={{color:"white",  backgroundColor:"white", fontWeight: "bold", borderRadius: 1, borderColor: "white", "& .MuiInputBase-input": { fontWeight: "bold", textAlign: "right" }}}
    />
  );
})}

        </Box>
      </Box>)}
`
      <Button
        variant="contained"
        fullWidth
        color="error"
        sx={{ mt: 2, fontSize: "1.2rem" }}
        onClick={()=>{
          handleSubmitExpenses();
          setEntries([])
          // handlePaidAndResetAll()
        }}
      >
         Submit and Reset All
      </Button>
    </Container>
  );
};

export default RecoveryPaper;