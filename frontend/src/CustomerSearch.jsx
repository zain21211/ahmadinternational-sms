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
import { useLocalStorageState } from "./hooks/LocalStorage"; // Assuming this path is correct
import { FixedSizeList } from "react-window";
import debounce from "lodash.debounce";

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

// Virtualized Suggestions List Component
const ITEM_SIZE = 48;

const VirtualizedSuggestionsList = React.forwardRef(
  function VirtualizedSuggestionsList(props, listRef) {
    const { data, onSelect, highlightedIndex, ...other } = props;
    const itemCount = data.length;
    const listHeight = Math.min(itemCount * ITEM_SIZE, 300);

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
                "&.Mui-focusVisible": {
                   backgroundColor: isHighlighted
                     ? "rgba(0, 0, 0, 0.12)"
                     : "rgba(0, 0, 0, 0.04)",
                 },
                overflow: 'hidden',
              }}
              selected={isHighlighted}
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
    );

    return (
      <Box {...other} sx={{ maxHeight: 300, overflowY: "auto" }}>
        <FixedSizeList
          ref={listRef}
          height={listHeight}
          itemSize={ITEM_SIZE}
          itemCount={itemCount}
          outerElementType="div"
          innerElementType="ul"
          itemData={data}
        >
          {Row}
        </FixedSizeList>
      </Box>
    );
  }
);


const LedgerSearchForm = React.memo(
  ({ usage, onFetch, onSelect, onReset, route, disabled, ID = null, ledgerLoading = false }) => {
    const [masterCustomerList, setMasterCustomerList] = useState([]);
    const [allCustomerOptions, setAllCustomerOptions] = useState([]);
    const [customerLoading, setCustomerLoading] = useState(false);
    const [customerError, setCustomerError] = useState(null);
    const [token] = useState(localStorage.getItem("authToken"));
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [displayedInputValue, setDisplayedInputValue] = useState('') // This state remains as per your original code

    const localStorageKey =
  usage === 'orderForm'
    ? "orderFormCustomerInput"
    : usage === 'recovery'
    ? "recoverpaperCustomerInput"
    : "ledgerCustomerInput";
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
    // All effects remain exactly as in your provided code, unless a change is explicitly mentioned for the popper bug.

    useEffect(() => {
      const value = selectedCustomer ? selectedCustomer.name : customerInput;
      setDisplayedInputValue(value);
    }, [selectedCustomer, customerInput]);

    useEffect(() => {
      let isMounted = true;
      const fetchCustomerList = async () => {
        setCustomerLoading(true);
        setCustomerError(null);
        try {
          const response = await axios.get(
            "http://100.122.80.93:3001/api/customers",

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
               setMasterCustomerList(validOptions);
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
         setMasterCustomerList([]);
      }

      return () => { isMounted = false; };
    }, [token, usage]); // Added usage as it is used in params - minor essential fix for correctness


    useEffect(() => {
      if (usage === 'recoverpaper') {
        setCustomerInput("");
      }
    }, [route, usage, setCustomerInput]); // Added usage, setCustomerInput for correctness

    useEffect(() => {
      if (selectedCustomer) {
        setCustomerInput(selectedCustomer.name);
      }
    }, [selectedCustomer, setCustomerInput]); // Added setCustomerInput for correctness

    useEffect(() => {
      let currentDisplayOptions;
      if (route && masterCustomerList.length > 0) {
        currentDisplayOptions = masterCustomerList.filter(cust => cust.route && cust.route.toLowerCase() === route.toLowerCase());
      } else {
        currentDisplayOptions = masterCustomerList;
      }
      setAllCustomerOptions(currentDisplayOptions);
    }, [route, masterCustomerList]);


    useEffect(() => {
      if (ID && allCustomerOptions.length > 0) {
        const customerToSelect = allCustomerOptions.find(cust => cust.acid === Number(ID));
        if (customerToSelect) {
          setSelectedCustomer(customerToSelect);
          setCustomerInput(customerToSelect.name);
          setCustomerError(null);
          if (onSelect) {
            onSelect(customerToSelect);
          }
        } else {
          setSelectedCustomer(null);
          setCustomerError(`Account ID "${ID}" not found${route ? ` for route "${route}"` : ' in the current list'}.`);
        }
      } else if (!ID && selectedCustomer) {
        setSelectedCustomer(null);
        if (customerError && customerError.toLowerCase().includes("account id")) {
          setCustomerError(null);
        }
        if (onSelect) {
          onSelect(null);
        }
      }
    }, [ID, allCustomerOptions, onSelect, route, setCustomerInput]);


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

                // The popper opening is now handled by handleCustomerInputChange
                // and the popper's open prop condition.

                if (filtered.length === 1  && (!selectedCustomer || selectedCustomer.acid !== filtered[0].acid)) {
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
    }, [customerInput, allCustomerOptions, selectedCustomer, onSelect, usage]); // Added usage as it's in condition


    useEffect(() => {
      if (popperOpen && listRef.current && highlightedIndex !== -1 && customerSuggestions.length > 0) {
        listRef.current.scrollToItem(highlightedIndex, "smart");
      }
    }, [highlightedIndex, popperOpen, customerSuggestions.length]);


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
        case "3-Months":
          start = new Date(today);
          start.setMonth(today.getMonth() - 3);
          end = new Date(today);
          break;
        case "lastYear":
          start = new Date(today.getFullYear() - 1, 0, 1);
          end = new Date(today.getFullYear() - 1, 11, 31);
          break;
        case "custom":
          if (!dates.startDate && !dates.endDate) {
              const defaultStart = new Date(today);
              defaultStart.setMonth(today.getMonth() - 3);
              setDates({
                  startDate: formatDateForInput(defaultStart),
                  endDate: formatDateForInput(today),
              });
          }
          return;
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
    }, [dateRangeType, dates.startDate, dates.endDate]);


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
        setPopperOpen(!!newValue); // This is key for opening the popper on input
      },
      [selectedCustomer, onSelect, setCustomerInput]
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
         setCustomerError("Please select a customer first.");
         return;
      }
      setCustomerError(null);

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
      // Open popper on focus only if there's already input and potentially suggestions or loading.
      // The main trigger for opening on typing is now handleCustomerInputChange.
      if (customerInput && (allCustomerOptions.length > 0 || customerLoading || customerSuggestions.length > 0)) {
        setPopperOpen(true);
      }
    }, [customerInput, allCustomerOptions.length, customerLoading, customerSuggestions.length]);


    const handleReset = useCallback(() => {
      if(onReset) {
          onReset('');
      }
      setSelectedCustomer(null);
      setCustomerInput("");
      setCustomerSuggestions([]);
      setPopperOpen(false);
      setHighlightedIndex(-1);
      setCustomerError(null);
      setDateRangeType("3-Months");

      if (onSelect) {
        onSelect(null);
      }
      customerInputRef.current?.focus();
    }, [onSelect, setCustomerInput, onReset]);

    useEffect(() => {
      if(ID){
        setCustomerInput('');
        setSelectedCustomer(null);
      }
    },[ID, setCustomerInput, setSelectedCustomer]); // Added setCustomerInput, setSelectedCustomer for correctness

    const isSearchButtonDisabled =
      customerLoading ||
      !selectedCustomer ||
      (masterCustomerList.length === 0 && !token) ||
      !!customerError ||
      (usage === 'ledger' && (!dates.startDate || !dates.endDate));

    const showInputError = !!customerError;

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
                  // ***** THIS IS THE PRIMARY FIX FOR THE POPPER ISSUE *****
                  onChange={handleCustomerInputChange}
                  // ***** END FIX *****
                  inputRef={customerInputRef}
                  onFocus={handleInputFocus}
                  onBlur={() => {
                     setTimeout(() => { if (document.activeElement !== customerInputRef.current) setPopperOpen(false); }, 150);
                  }}
                  onKeyDown={handleInputKeyDown}
                  error={showInputError}
                  disabled={(customerLoading && masterCustomerList.length === 0) || disabled}
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
                          disabled={(customerLoading && masterCustomerList.length === 0) || disabled}
                        >
                          <RestartAltIcon />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
               <Popper
                 open={popperOpen && customerSuggestions.length > 0} // This condition remains the same
                 anchorEl={customerInputRef.current}
                 placement="bottom-start"
                 sx={{
                    zIndex: 1300,
                    width: customerInputRef.current
                      ? `${customerInputRef.current.clientWidth}px`
                      : '100%',
                    maxWidth: '100%',
                    minWidth: '400px',
                    backgroundColor: 'white',
                    boxShadow: 3,
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
              !customerError && token && (
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
                      onChange={handleDateChange}
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
                  disabled={isSearchButtonDisabled || ledgerLoading}
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