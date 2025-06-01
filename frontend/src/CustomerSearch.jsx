import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  TextField,
  Button,
  Grid,
  CircularProgress,
  Box,
  Typography,
  InputAdornment,
  Divider,
  IconButton,
  FormControl,
  InputLabel,
  MenuItem as MuiMenuItem,
  Select,
  Paper,
  ClickAwayListener,
  Popper,
  ListItemText,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import EventIcon from "@mui/icons-material/Event";
import PersonIcon from "@mui/icons-material/Person";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import axios from "axios";
import { useLocalStorageState } from "./hooks/LocalStorage";
import { FixedSizeList } from "react-window";
import debounce from "lodash.debounce";

const url ='http://100.122.80.93:3001/'
// Helper function to format date for input fields
const formatDateForInput = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return "";
  }
  const year = d.getFullYear();
  const month = `0${d.getMonth() + 1}`.slice(-2);
  const day = `0${d.getDate()}`.slice(-2);
  return `${year}-${month}-${day}`;
};

// Predefined date range options
const dateRangeOptions = [
  { label: "3-Months", value: "3-Months" },
  { label: "This Week", value: "thisWeek" },
  { label: "Last Week", value: "lastWeek" },
  { label: "This Month", value: "thisMonth" },
  { label: "Last Month", value: "lastMonth" },
  { label: "This Year", value: "thisYear" },
  { label: "Last Year", value: "lastYear" },
  { label: "Custom Range", value: "custom" },
];

// Helper function to convert wildcard string to regex
const wildcardToRegex = (pattern) => {
  return pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*");
};

// Virtualized Suggestions List Component (Assuming this works as intended)
const ITEM_SIZE = 48; // Height of each item in pixels

const VirtualizedSuggestionsList = React.forwardRef(
  function VirtualizedSuggestionsList(props, listRef) {
    const { data, onSelect, highlightedIndex, ...other } = props;
    const itemCount = data.length;
    // Set max height to prevent list from growing too large
    const listHeight = Math.min(itemCount * ITEM_SIZE, 300); // Max 300px or fewer items * ITEM_SIZE

    const Row = useCallback(
      ({ index, style, data: itemData }) => {
        const customer = itemData[index];
        const isHighlighted = index === highlightedIndex;

        if (!customer || !customer.name || !customer.acid) {
          return null;
        }

        return (
          <div style={style} key={customer.acid}>
            <MuiMenuItem
              component="li"
              onClick={() => onSelect(customer)}
              sx={{
                width: "100%",
                height: "100%",
                boxSizing: "border-box",
                borderBottom: "1px solid rgba(0, 0, 0, 0.12)",
                backgroundColor: isHighlighted
                  ? "rgba(0, 0, 0, 0.08)"
                  : "transparent",
                "&:hover": {
                  backgroundColor: isHighlighted
                    ? "rgba(0, 0, 0, 0.12)"
                    : "rgba(0, 0, 0, 0.04)",
                },
                 // Ensure focus styles are consistent
                "&.Mui-focusVisible": {
                   backgroundColor: isHighlighted
                     ? "rgba(0, 0, 0, 0.12)"
                     : "rgba(0, 0, 0, 0.04)",
                 },
                overflow: 'hidden',
              }}
              selected={isHighlighted} // Use MUI selected prop for accessibility
            >
              <ListItemText
                primary={customer.name}
                secondary={`ID # ${customer.acid}${customer.route ? ` - Route: ${customer.route}` : ''}`}
                primaryTypographyProps={{ noWrap: true }}
                secondaryTypographyProps={{ noWrap: true }}
              />
            </MuiMenuItem>
          </div>
        );
      },
      [onSelect, highlightedIndex]
    ); // Recreate Row if onSelect or highlightedIndex changes

    return (
      <Box {...other} sx={{ maxHeight: 300, overflowY: "auto" }}>
        <FixedSizeList
          ref={listRef}
          height={listHeight}
          itemSize={ITEM_SIZE}
          itemCount={itemCount}
          outerElementType="div"
          innerElementType="ul"
          itemData={data} // Pass data as itemData for FixedSizeList
        >
          {/* FixedSizeList uses a render prop pattern, 'Row' component is passed here */}
          {Row}
        </FixedSizeList>
      </Box>
    );
  }
);


const LedgerSearchForm = React.memo(
  ({ usage, onFetch, onSelect, onReset, route, disabled, ID = null, ledgerLoading = false }) => {
    const [masterCustomerList, setMasterCustomerList] = useState([]); // Holds the full list from API
    const [allCustomerOptions, setAllCustomerOptions] = useState([]); // Holds route-filtered list for suggestions
    const [customerLoading, setCustomerLoading] = useState(false);
    const [customerError, setCustomerError] = useState(null);
    const [token] = useState(localStorage.getItem("authToken"));
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [displayedInputValue, setDisplayedInputValue] = useState('')

    const localStorageKey =
  usage === 'orderForm'
    ? "orderFormCustomerInput"
    : usage === 'recovery'
    ? "recoverpaperCustomerInput" // New key for recoverpaper
    : "ledgerCustomerInput"; // Default for 'ledger' or any other unspecified usage
    const [customerInput, setCustomerInput] = useLocalStorageState(localStorageKey, "");

    const [customerSuggestions, setCustomerSuggestions] = useState([]);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const customerInputRef = useRef(null);
    const searchButtonRef = useRef(null);
    const [popperOpen, setPopperOpen] = useState(false);
    const listRef = useRef(null);

    const initialDates = useMemo(() => {
      const today = new Date();
      const start = new Date(today);
      start.setMonth(today.getMonth() - 3);
      const end = new Date(today);
      return {
        startDate: formatDateForInput(start),
        endDate: formatDateForInput(end),
      };
    }, []);

    const [dates, setDates] = useState(initialDates);
    const [dateRangeType, setDateRangeType] = useState("3-Months");

    // --- Effects ---

        // Displayed input value logic
    useEffect(() => {
      const value = selectedCustomer ? selectedCustomer.name : customerInput;
      setDisplayedInputValue(value);
      }, [selectedCustomer, customerInput]);

    // Effect to fetch the initial customer list
    useEffect(() => {
      let isMounted = true;
      const fetchCustomerList = async () => {
        setCustomerLoading(true);
        setCustomerError(null);
        try {
          const response = await axios.get(
            `${url}api/customers`,
            {
              headers: { Authorization: `Bearer ${token}` },
              params:{
                form: usage,
              }
            }
          );

          if (Array.isArray(response.data)) {
            const validOptions = response.data.filter(
              (cust) => cust && typeof cust === "object" && cust.name && cust.acid
            );
            if (isMounted) {
               setMasterCustomerList(validOptions); // Set the master list
            }
          } else {
            console.error("API returned data is not an array:", response.data);
             if (isMounted) {
               setCustomerError("Failed to load customer list (invalid format from API).");
               setMasterCustomerList([]);
             }
          }
        } catch (error) {
          console.error("Error fetching customers:", error);
          const apiErrorMessage = error.response?.data?.message || error.message;
          if (isMounted) {
             setCustomerError(`Failed to load customer list: ${apiErrorMessage}`);
             setMasterCustomerList([]);
          }
        } finally {
          if (isMounted) {
             setCustomerLoading(false);
          }
        }
      };

      if (token) {
         fetchCustomerList();
      } else {
         setCustomerError("Authentication token not found. Please log in.");
         setMasterCustomerList([]); // Ensure list is empty if no token
      }

      return () => { isMounted = false; };
    }, [token]);


    useEffect(() => {
      console.log("customerinput = ", customerInput);
      if (usage === 'recoverpaper') {
        setCustomerInput("");
        console.log("Setting customerInput to:", customerInput);
      
      }

    }, [route]); // Empty effect to ensure masterCustomerList is initialized before other effects

    useEffect(() => {
  if (selectedCustomer) {
    setCustomerInput(selectedCustomer.name);
  }
}, [selectedCustomer]);

    // Effect to filter masterCustomerList by route into allCustomerOptions
    useEffect(() => {
      let currentDisplayOptions;
      if (route && masterCustomerList.length > 0) {
        currentDisplayOptions = masterCustomerList.filter(cust => cust.route && cust.route.toLowerCase() === route.toLowerCase());
        console.log("Filtered customers by route:", route, currentDisplayOptions);
      } else {
        currentDisplayOptions = masterCustomerList;
      }
      setAllCustomerOptions(currentDisplayOptions);
      // selectedCustomer validity will be handled by ID effect or debounce suggestion effect
      // when allCustomerOptions changes.
    }, [route, masterCustomerList]);


    // Effect to handle initial ID prop selection AFTER options are loaded
    useEffect(() => {
      if (ID && allCustomerOptions.length > 0) {
        // allCustomerOptions is already filtered by route if route prop is active
        const customerToSelect = allCustomerOptions.find(cust => cust.acid === Number(ID));
        console.log("Selecting customer by ID:", ID, customerToSelect, "from options:", allCustomerOptions);
        if (customerToSelect) {
          setSelectedCustomer(customerToSelect);
          setCustomerInput(customerToSelect.name);
          setCustomerError(null);
          if (onSelect) {
            onSelect(customerToSelect);
          }
        } else {
          setSelectedCustomer(null);
          // customerInput is not cleared here to preserve user typing if ID is just a mismatch
          setCustomerError(`Account ID "${ID}" not found${route ? ` for route "${route}"` : ' in the current list'}.`);
         
        }
      } else if (!ID && selectedCustomer) { // If ID prop is removed/falsy
        setSelectedCustomer(null);
        // Consider if customerInput should be cleared if it was set by this effect previously.
        // For now, only clear selectedCustomer and error.
        if (customerError && customerError.toLowerCase().includes("account id")) { // Clear any ID-not-found error
          setCustomerError(null);
        }
        if (onSelect) {
          onSelect(null);
        }
      }
    }, [ID, allCustomerOptions, onSelect, route, setCustomerInput]); // Added route for error msg, setCustomerInput for ESLint (as it's a dependency)


    // Debounced effect to filter suggestions based on customerInput
    useEffect(() => {
        const filterSuggestions = debounce((input, options) => {
            if (!input) {
                setCustomerSuggestions([]);
                setHighlightedIndex(-1);
                return;
            }
            try {
                const regexPattern = wildcardToRegex(input);
                const regex = new RegExp(regexPattern, "i");
                const filtered = options.filter(
                  (option) =>
                    option &&
                    typeof option === "object" &&
                    option.name &&
                    typeof option.name === "string" &&
                    regex.test(option.name)
                );

                setCustomerSuggestions(filtered);
                setHighlightedIndex(filtered.length > 0 ? 0 : -1);

                if (filtered.length === 1 && (usage === "orderForm") && (!selectedCustomer || selectedCustomer.acid !== filtered[0].acid)) {
                   setSelectedCustomer(filtered[0]);
                    if (onSelect) {
                        onSelect(filtered[0]);
                    }
                } else if (selectedCustomer && filtered.every(f => f.acid !== selectedCustomer.acid)) {
                   setSelectedCustomer(null);
                    if (onSelect) {
                       onSelect(null);
                    }
                }

            } catch (e) {
                console.error("Invalid regex pattern from input:", input, e);
                setCustomerSuggestions([]);
                setHighlightedIndex(-1);
            }
        }, 300);

        filterSuggestions(customerInput, allCustomerOptions);

        return () => {
            filterSuggestions.cancel();
        };
    }, [customerInput, allCustomerOptions, selectedCustomer, onSelect]);


    // Effect to scroll virtualized list when highlighted index changes
    useEffect(() => {
      if (popperOpen && listRef.current && highlightedIndex !== -1 && customerSuggestions.length > 0) {
        listRef.current.scrollToItem(highlightedIndex, "smart");
      }
    }, [highlightedIndex, popperOpen, customerSuggestions.length]);


    // Effect to update dates when dateRangeType changes
    useEffect(() => {
      const today = new Date();
      let start, end;

      switch (dateRangeType) {
        case "thisWeek":
          start = new Date(today);
          start.setDate(today.getDate() - today.getDay());
          end = new Date(today);
          break;
        case "lastWeek":
          start = new Date(today);
          start.setDate(today.getDate() - today.getDay() - 7);
          end = new Date(today);
          end.setDate(today.getDate() - today.getDay() - 1);
          break;
        case "thisMonth":
          start = new Date(today.getFullYear(), today.getMonth(), 1);
          end = new Date(today);
          break;
        case "lastMonth":
          start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          end = new Date(today.getFullYear(), today.getMonth(), 0);
          break;
        case "thisYear":
          start = new Date(today.getFullYear(), 0, 1);
          end = new Date(today);
          break;
        case "3-Months": // Default case handles this too
          start = new Date(today);
          start.setMonth(today.getMonth() - 3);
          end = new Date(today);
          break;
        case "lastYear":
          start = new Date(today.getFullYear() - 1, 0, 1);
          end = new Date(today.getFullYear() - 1, 11, 31);
          break;
        case "custom":
          // If switching TO custom and dates are not set, initialize them.
          if (!dates.startDate && !dates.endDate) {
              const defaultStart = new Date(today);
              defaultStart.setMonth(today.getMonth() - 3);
              setDates({
                  startDate: formatDateForInput(defaultStart),
                  endDate: formatDateForInput(today),
              });
          }
          return; // Do not proceed for 'custom' if already set or just initialized
        default:
          start = new Date(today);
          start.setMonth(today.getMonth() - 3);
          end = new Date(today);
      }

      const newStartDate = formatDateForInput(start);
      const newEndDate = formatDateForInput(end);

      if (dates.startDate !== newStartDate || dates.endDate !== newEndDate) {
        setDates({
          startDate: newStartDate,
          endDate: newEndDate,
        });
      }
    }, [dateRangeType, dates.startDate, dates.endDate]); // Keep dependencies as is, internal logic prevents loops


    // --- Event Handlers ---

    const handleCustomerInputChange = useCallback(
      (event) => {
        const newValue = event.target.value;
        setCustomerInput(newValue);
        setCustomerError(null);

        if (selectedCustomer && selectedCustomer.name !== newValue) {
          setSelectedCustomer(null);
          if (onSelect) {
             onSelect(null);
          }
        }
        setPopperOpen(!!newValue);
      },
      [selectedCustomer, onSelect, setCustomerInput] // setCustomerInput is from hook
    );

    const handleSuggestionClick = useCallback((customer) => {
      setSelectedCustomer(customer);
      setCustomerInput(customer.name);
      setCustomerSuggestions([]);
      setPopperOpen(false);
      setHighlightedIndex(-1);
      setCustomerError(null);
      if (onSelect) {
        onSelect(customer);
      }
      if (usage === 'ledger') {
          searchButtonRef.current?.focus();
      }
    }, [onSelect, usage, setCustomerInput]);

    const handleTriggerFetch = useCallback(() => {
      const currentCustomer = selectedCustomer;
      if (!currentCustomer || !currentCustomer.acid) {
         console.warn("Fetch triggered without a selected customer object.");
         setCustomerError("Please select a customer first."); // Provide user feedback
         return;
      }
      setCustomerError(null); // Clear previous error if any

      if (usage === 'ledger' && onFetch) {
        console.log("Triggering fetch for ledger...", {
            acid: currentCustomer.acid,
            name: currentCustomer.name || "",
            startDate: dates.startDate,
            endDate: dates.endDate,
        });
        onFetch({
          acid: currentCustomer.acid,
          name: currentCustomer.name || "",
          startDate: dates.startDate,
          endDate: dates.endDate,
        });
      } else {
         console.log(`Fetch triggered with usage="${usage}", but onFetch is not defined or usage is not 'ledger'.`);
      }
    }, [onFetch, selectedCustomer, dates, usage]);


    const handleInputKeyDown = useCallback(
      (event) => {
        const { key } = event;
        const suggestionCount = customerSuggestions.length;

        if (popperOpen && suggestionCount > 0) {
          if (key === "ArrowDown") {
            event.preventDefault();
            setHighlightedIndex((prevIndex) =>
              prevIndex < suggestionCount - 1 ? prevIndex + 1 : 0
            );
          } else if (key === "ArrowUp") {
            event.preventDefault();
            setHighlightedIndex((prevIndex) =>
              prevIndex > 0 ? prevIndex - 1 : suggestionCount - 1
            );
          } else if (key === "Escape") {
            event.preventDefault();
            setPopperOpen(false);
            setHighlightedIndex(-1);
          } else if (key === "Enter") {
            event.preventDefault();
            const indexToSelect = highlightedIndex === -1 ? 0 : highlightedIndex;
            if (suggestionCount > 0 && indexToSelect < suggestionCount && customerSuggestions[indexToSelect]) {
              handleSuggestionClick(customerSuggestions[indexToSelect]);
            }
          }
        }
        else if (key === "Enter") {
             event.preventDefault();
             if (selectedCustomer) {
                 if (usage === 'ledger') {
                    handleTriggerFetch();
                 }
             } else if (customerInput && suggestionCount > 0 && customerSuggestions[0]) {
                 handleSuggestionClick(customerSuggestions[0]);
             }
        }
         else if (
          key === "ArrowDown" &&
          !popperOpen &&
          customerInput &&
          suggestionCount > 0
        ) {
          event.preventDefault();
          setPopperOpen(true);
          setHighlightedIndex(0);
        }
      },
      [
        popperOpen,
        customerSuggestions,
        highlightedIndex,
        customerInput,
        selectedCustomer,
        usage,
        handleSuggestionClick,
        handleTriggerFetch,
      ]
    );

    const handleDateChange = useCallback((e) => {
      setDates((prevDates) => ({
        ...prevDates,
        [e.target.name]: e.target.value,
      }));
      setDateRangeType("custom");
    }, []);

    const handleClickAway = useCallback(() => {
        if (popperOpen) {
           setPopperOpen(false);
           setHighlightedIndex(-1);
        }
    }, [popperOpen]);

    const handleInputFocus = useCallback(() => {
      if (customerInput && (allCustomerOptions.length > 0 || customerLoading || customerSuggestions.length > 0)) {
        setPopperOpen(true);
      }
    }, [customerInput, allCustomerOptions.length, customerLoading, customerSuggestions.length]);


    const handleReset = useCallback(() => {
      if(onReset) { // Call onReset if provided
          onReset('');
      }
      setSelectedCustomer(null);
      setCustomerInput("");
      setCustomerSuggestions([]);
      setPopperOpen(false);
      setHighlightedIndex(-1);
      setCustomerError(null);
      setDateRangeType("3-Months"); // This will trigger the date effect to reset dates

      if (onSelect) {
        onSelect(null);
      }
      customerInputRef.current?.focus();
    }, [onSelect, setCustomerInput, onReset]); // Removed initialDates, added onReset

    useEffect(() => {
      if(ID){
        setCustomerInput('');
        setSelectedCustomer(null);
      }
    },[ID]);



    const isSearchButtonDisabled =
      customerLoading || // Internal customer list loading
      !selectedCustomer ||
      (masterCustomerList.length === 0 && !token) || // No data possible if no token and no master list
      !!customerError || // Error related to customer input/selection
      (usage === 'ledger' && (!dates.startDate || !dates.endDate));




    const showInputError = !!customerError; // Simplified: only show error if customerError is set.
                                          // Other states handled by helperText.

    // const inputHelperText = customerLoading ? 'Loading customers...' :
    //                       customerError ? customerError :
    //                       (customerInput?.length > 0 && !selectedCustomer && !customerLoading && allCustomerOptions?.length > 0) ? 'Type to search or select a customer.' :
    //                       (customerInput?.length > 0 && !selectedCustomer && !customerLoading && allCustomerOptions?.length === 0 && masterCustomerList?.length > 0) ? 'No customers match your search for this route.' :
    //                        null;


    return (
      <Box>
        <Grid container spacing={2} marginY={usage === 'ledger' ? 1 : 1} maxWidth={"xl"} sx={{ width: '100%' }}>
          <Grid item xs={12} sx={{ overflowX: "hidden", width: "100%" }}>
            <ClickAwayListener onClickAway={handleClickAway}>
              <Box sx={{ position: "relative", width: "100%" }}>
                <TextField
                  fullWidth
                  variant="outlined"
                  label="Customer"
                 value={customerInput}
  onChange={(e) => setCustomerInput(e.target.value)}
                  inputRef={customerInputRef}
                  onFocus={handleInputFocus}
                  onBlur={() => {
                     setTimeout(() => { if (document.activeElement !== customerInputRef.current) setPopperOpen(false); }, 150);
                  }}
                  onKeyDown={handleInputKeyDown}
                  error={showInputError}
                  // helperText={inputHelperText}
                  disabled={customerLoading && masterCustomerList.length === 0 || disabled} // Only disable if truly no options yet and loading
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        {customerLoading && masterCustomerList.length === 0 ? (
                          <CircularProgress color="inherit" size={20} />
                        ) : (
                          <PersonIcon color="primary" />
                        )}
                      </InputAdornment>
                    ),
                    endAdornment: (customerInput || selectedCustomer) && (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={handleReset}
                          edge="end"
                          size="small"
                          aria-label="clear input"
                          disabled={customerLoading && masterCustomerList.length === 0 || disabled}
                        >
                          <RestartAltIcon />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
               <Popper
                 open={popperOpen && customerSuggestions.length > 0}
                 anchorEl={customerInputRef.current}
                 placement="bottom-start"
                 sx={{
    zIndex: 1300,
    width: customerInputRef.current
      ? `${customerInputRef.current.clientWidth}px`
      : '100%', // fallback
    maxWidth: '100%',     // Prevents overflow
    minWidth: '400px',    // Optional: enforce a minimum width
    backgroundColor: 'white', // Optional: ensure it's visible
    boxShadow: 3,             // Optional: elevation
  }}
               >
                  <Paper elevation={3} sx={{ maxHeight: 300, overflowY: 'auto' }}>
                    <VirtualizedSuggestionsList
                      ref={listRef}
                      data={customerSuggestions}
                      onSelect={handleSuggestionClick}
                      highlightedIndex={highlightedIndex}
                    />
                  </Paper>
                </Popper>
              </Box>
            </ClickAwayListener>

            {!customerLoading &&
              masterCustomerList.length === 0 &&
              !customerError && token && ( // Show only if token was present, implying fetch was attempted
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 1, display: "flex", alignItems: "center" }}
                >
                  <ErrorOutlineIcon fontSize="small" sx={{ mr: 0.5 }} />
                  No customer data found.
                </Typography>
              )}
          </Grid>

          {usage === "ledger" && (
            <>
              <Grid item xs={12}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel id="date-range-label">Date Range</InputLabel>
                  <Select
                    labelId="date-range-label"
                    id="date-range-select"
                    value={dateRangeType}
                    onChange={(e) => setDateRangeType(e.target.value)}
                    label="Date Range"
                    startAdornment={
                      <InputAdornment position="start">
                        <EventIcon color="primary" />
                      </InputAdornment>
                    }
                  >
                    {dateRangeOptions.map((option) => (
                      <MuiMenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MuiMenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {dateRangeType === "custom" && (
                <>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Start Date"
                      name="startDate"
                      type="date"
                      variant="outlined"
                      value={dates.startDate}
                      onChange={handleDateChange}
                      InputLabelProps={{ shrink: true }}
                      InputProps={{
                        startAdornment: ( <InputAdornment position="start"> <EventIcon color="action" /> </InputAdornment> ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="End Date"
                      name="endDate"
                      type="date"
                      variant="outlined"
                      value={dates.endDate}
                      onChange={handleDateChange
                      }
                      InputLabelProps={{ shrink: true }}
                      InputProps={{
                        startAdornment: ( <InputAdornment position="start"> <EventIcon color="action" /> </InputAdornment> ),
                      }}
                    />
                  </Grid>
                </>
              )}

              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<RestartAltIcon />}
                  onClick={handleReset}
                  disabled={customerLoading && masterCustomerList.length === 0}
                  sx={{ height: "56px" }}
                >
                  Reset
                </Button>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  startIcon={
                    ledgerLoading ? (
                      <CircularProgress size={24} color="inherit" />
                    ) : (
                      <SearchIcon />
                    )
                  }
                  onClick={handleTriggerFetch}
                  disabled={isSearchButtonDisabled || ledgerLoading} // Use specific var and external loading
                  sx={{ height: "56px" }}
                  ref={searchButtonRef}
                >
                  {ledgerLoading ? "Searching..." : "Search"}
                </Button>
              </Grid>
            </>
          )}
        </Grid>
      </Box>
    );
  }
);

export default LedgerSearchForm;