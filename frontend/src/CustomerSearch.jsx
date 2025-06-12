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
  // Divider, // Not used
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

// USER A Logic
const userTypes = ["operator", "admin"];
let isAllowedForDateRanges = false;
try {
  const userString = localStorage.getItem("user");
  if (userString) {
    const user = JSON.parse(userString);
    if (user && user.userType && typeof user.userType === "string") {
      isAllowedForDateRanges = userTypes.includes(user.userType.toLowerCase());
    }
  }
} catch (error) {
  // console.error("LedgerSearchForm: Failed to parse user data:", error);
}

const dateRangeOptions = [
  { label: "3-Months", value: "3-Months", isAllowed: true },
  { label: "This Week", value: "thisWeek", isAllowed: isAllowedForDateRanges },
  { label: "Last Week", value: "lastWeek", isAllowed: isAllowedForDateRanges },
  {
    label: "This Month",
    value: "thisMonth",
    isAllowed: isAllowedForDateRanges,
  },
  {
    label: "Last Month",
    value: "lastMonth",
    isAllowed: isAllowedForDateRanges,
  },
  { label: "This Year", value: "thisYear", isAllowed: isAllowedForDateRanges },
  { label: "Last Year", value: "lastYear", isAllowed: isAllowedForDateRanges },
  { label: "Custom Range", value: "custom", isAllowed: true },
];

const allowedDateRangeOptions = dateRangeOptions.filter(
  (option) => option.isAllowed
);

const wildcardToRegex = (pattern) => {
  return pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*");
};

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
        if (!customer?.name || !customer?.acid) return null;
        return (
          <div style={style} key={customer.acid}>
            <MuiMenuItem
              component="li"
              onClick={() => onSelect(customer)}
              sx={{
                width: "100%",
                height: "100%",
                boxSizing: "border-box",
                borderBottom: "1px solid rgba(0,0,0,0.12)",
                backgroundColor: isHighlighted
                  ? "rgba(0,0,0,0.08)"
                  : "transparent",
                "&:hover": {
                  backgroundColor: isHighlighted
                    ? "rgba(0,0,0,0.12)"
                    : "rgba(0,0,0,0.04)",
                },
                "&.Mui-focusVisible": {
                  backgroundColor: isHighlighted
                    ? "rgba(0,0,0,0.12)"
                    : "rgba(0,0,0,0.04)",
                },
                overflow: "hidden",
              }}
              selected={isHighlighted}
            >
              <ListItemText
                primary={customer.name}
                secondary={`ID # ${customer.acid}${
                  customer.route ? ` - Route: ${customer.route}` : ""
                }`}
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
  ({
    usage,
    onFetch,
    onSelect,
    onReset,
    route,
    disabled,
    ID = null,
    ledgerLoading = false,
    name = "",
  }) => {
    const [masterCustomerList, setMasterCustomerList] = useState([]);
    const [allCustomerOptions, setAllCustomerOptions] = useState([]);
    const [customerLoading, setCustomerLoading] = useState(false);
    const [customerError, setCustomerError] = useState(null);
    const [token] = useState(localStorage.getItem("authToken"));
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const localStorageKey = useMemo(
      () =>
        usage === "orderForm"
          ? "orderFormCustomerInput"
          : usage === "recovery"
          ? "recoverpaperCustomerInput"
          : "ledgerCustomerInput",
      [usage]
    );
    const [customerInput, setCustomerInput] = useLocalStorageState(
      localStorageKey,
      ""
    );
    const [customerSuggestions, setCustomerSuggestions] = useState([]);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const customerInputRef = useRef(null);
    const searchButtonRef = useRef(null);
    const [popperOpen, setPopperOpen] = useState(false);
    const listRef = useRef(null);
    const prevNameProp = useRef(name);

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

    useEffect(() => {
      if (
        (name && name !== prevNameProp.current) ||
        (name && !prevNameProp.current && customerInput !== name)
      ) {
        setCustomerInput(name);
        if (selectedCustomer && selectedCustomer.name !== name) {
          setSelectedCustomer(null);
          if (onSelect) onSelect(null);
        }
      }
      prevNameProp.current = name;
    }, [
      name,
      customerInput,
      selectedCustomer,
      setCustomerInput,
      setSelectedCustomer,
      onSelect,
    ]);

    useEffect(() => {
      if (selectedCustomer) setPopperOpen(false);
    }, [selectedCustomer]);

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
              params: { form: usage },
            }
          );
          if (isMounted) {
            if (Array.isArray(response.data))
              setMasterCustomerList(
                response.data.filter((c) => c?.name && c?.acid)
              );
            else {
              setCustomerError("Invalid customer list format.");
              setMasterCustomerList([]);
            }
          }
        } catch (error) {
          if (isMounted) {
            setCustomerError(
              `Load failed: ${error.response?.data?.message || error.message}`
            );
            setMasterCustomerList([]);
          }
        } finally {
          if (isMounted) setCustomerLoading(false);
        }
      };
      if (token) fetchCustomerList();
      else {
        setCustomerError("Auth token missing.");
        setMasterCustomerList([]);
      }
      return () => {
        isMounted = false;
      };
    }, [token, usage]);

    useEffect(() => {
      if (usage === "recoverpaper" || usage === "recovery")
        setCustomerInput("");
    }, [route, usage, setCustomerInput]);
    useEffect(() => {
      if (selectedCustomer && customerInput !== selectedCustomer.name)
        setCustomerInput(selectedCustomer.name);
    }, [selectedCustomer, customerInput, setCustomerInput]);
    useEffect(() => {
      setAllCustomerOptions(
        route && masterCustomerList.length > 0
          ? masterCustomerList.filter(
              (c) => c.route?.toLowerCase() === route.toLowerCase()
            )
          : masterCustomerList
      );
    }, [route, masterCustomerList]);

    useEffect(() => {
      if (ID && allCustomerOptions.length > 0) {
        const cust = allCustomerOptions.find((c) => c.acid === Number(ID));
        if (cust) {
          if (!selectedCustomer || selectedCustomer.acid !== cust.acid) {
            setSelectedCustomer(cust);
            if (onSelect) onSelect(cust);
          }
          if (customerInput !== cust.name) setCustomerInput(cust.name);
          setCustomerError(null);
        } else {
          if (selectedCustomer) setSelectedCustomer(null);
          setCustomerError(
            `ID "${ID}" not found${route ? ` for route "${route}"` : ""}.`
          );
          if (onSelect) onSelect(null);
        }
      }
    }, [
      ID,
      allCustomerOptions,
      onSelect,
      route,
      selectedCustomer,
      customerInput,
      setCustomerInput,
      setSelectedCustomer,
      setCustomerError,
    ]);

    // MODIFIED: useEffect for debounced suggestions with auto-select and search
    useEffect(() => {
      const filterSuggestionsDebounced = debounce(
        (
          currentInputValue,
          currentOptions,
          currentSelectedCust, // Renamed to avoid conflict with state
          currentDates // Pass current dates for search
        ) => {
          if (!currentInputValue) {
            // Should be handled by the else block below, but good guard
            setCustomerSuggestions([]);
            setHighlightedIndex(-1);
            return;
          }
          try {
            const regex = new RegExp(wildcardToRegex(currentInputValue), "i");
            const filtered = currentOptions.filter(
              (opt) => opt?.name && regex.test(opt.name)
            );

            if (
              filtered.length === 1 &&
              (!currentSelectedCust ||
                currentSelectedCust.acid !== filtered[0].acid) &&
              currentInputValue === customerInput // Ensure this debounced call is for the latest input
            ) {
              const customerToSelect = filtered[0];

              setSelectedCustomer(customerToSelect);
              // setCustomerInput(customerToSelect.name); // Handled by selectedCustomer effect
              setCustomerSuggestions([]);
              setPopperOpen(false);
              setHighlightedIndex(-1);
              setCustomerError(null);

              if (onSelect) {
                onSelect(customerToSelect);
              }

              if (usage === "ledger" && onFetch) {
                onFetch({
                  acid: customerToSelect.acid,
                  name: customerToSelect.name || "",
                  startDate: currentDates.startDate,
                  endDate: currentDates.endDate,
                });
              }
              return; // Auto-selection and search processed
            }

            setCustomerSuggestions(filtered);
            setHighlightedIndex(filtered.length > 0 ? 0 : -1);
          } catch (e) {
            console.error("Regex error in suggestions:", e);
            setCustomerSuggestions([]);
            setHighlightedIndex(-1);
          }
        },
        300
      );

      if (customerInput) {
        filterSuggestionsDebounced(
          customerInput,
          allCustomerOptions,
          selectedCustomer,
          dates
        );
      } else {
        setCustomerSuggestions([]);
        setHighlightedIndex(-1);
        // Popper might be closed by handleCustomerInputChange if input is empty
      }

      return () => filterSuggestionsDebounced.cancel();
    }, [
      customerInput,
      allCustomerOptions,
      selectedCustomer,
      dates, // Core data dependencies
      usage,
      onFetch,
      onSelect, // Props/callbacks for actions
      setSelectedCustomer,
      setCustomerError,
      setCustomerSuggestions, // Setters
      setPopperOpen,
      setHighlightedIndex, // Setters
    ]);

    useEffect(() => {
      if (
        popperOpen &&
        listRef.current &&
        highlightedIndex !== -1 &&
        customerSuggestions.length > 0
      )
        listRef.current.scrollToItem(highlightedIndex, "smart");
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
            const d = new Date(today);
            d.setMonth(today.getMonth() - 3);
            setDates({
              startDate: formatDateForInput(d),
              endDate: formatDateForInput(today),
            });
          }
          return;
        default:
          start = new Date(today);
          start.setMonth(today.getMonth() - 3);
          end = new Date(today);
      }
      const newS = formatDateForInput(start);
      const newE = formatDateForInput(end);
      if (dates.startDate !== newS || dates.endDate !== newE)
        setDates({ startDate: newS, endDate: newE });
    }, [dateRangeType, dates.startDate, dates.endDate, setDates]);

    const handleCustomerInputChange = useCallback(
      (event) => {
        const val = event.target.value;
        setCustomerInput(val);
        setCustomerError(null);
        if (selectedCustomer && selectedCustomer.name !== val) {
          setSelectedCustomer(null);
          if (onSelect) onSelect(null);
        }
        setPopperOpen(!!val);
      },
      [selectedCustomer, onSelect, setCustomerInput, setSelectedCustomer]
    );

    // MODIFIED: handleSuggestionClick to also trigger search for ledger
    const handleSuggestionClick = useCallback(
      (customer) => {
        setSelectedCustomer(customer);
        // setCustomerInput(customer.name); // Handled by selectedCustomer effect
        setCustomerSuggestions([]);
        setPopperOpen(false);
        setHighlightedIndex(-1);
        setCustomerError(null);

        if (onSelect) {
          onSelect(customer);
        }

        // Trigger search if usage is ledger
        if (usage === "ledger" && onFetch) {
          onFetch({
            acid: customer.acid,
            name: customer.name || "",
            startDate: dates.startDate, // Use current dates from state
            endDate: dates.endDate,
          });
        } else if (usage === "ledger") {
          // Fallback if onFetch not provided
          searchButtonRef.current?.focus();
        }
      },
      [
        onSelect,
        usage,
        onFetch,
        dates, // dates object is a dependency
        setSelectedCustomer,
        setCustomerError,
        setCustomerSuggestions,
        setPopperOpen,
        setHighlightedIndex,
      ]
    );

    const handleTriggerFetch = useCallback(() => {
      if (!selectedCustomer?.acid) {
        setCustomerError("Please select a customer.");
        return;
      }
      setCustomerError(null);
      if (usage === "ledger" && onFetch)
        onFetch({
          acid: selectedCustomer.acid,
          name: selectedCustomer.name || "",
          startDate: dates.startDate,
          endDate: dates.endDate,
        });
    }, [onFetch, selectedCustomer, dates, usage, setCustomerError]);

    const handleInputKeyDown = useCallback(
      (event) => {
        const { key } = event;
        const count = customerSuggestions.length;
        if (popperOpen && count > 0) {
          if (key === "ArrowDown") {
            event.preventDefault();
            setHighlightedIndex((prev) => (prev < count - 1 ? prev + 1 : 0));
          } else if (key === "ArrowUp") {
            event.preventDefault();
            setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : count - 1));
          } else if (key === "Escape") {
            event.preventDefault();
            setPopperOpen(false);
            setHighlightedIndex(-1);
          } else if (key === "Enter") {
            event.preventDefault();
            if (
              highlightedIndex !== -1 &&
              customerSuggestions[highlightedIndex]
            )
              handleSuggestionClick(customerSuggestions[highlightedIndex]);
            else if (count > 0 && customerSuggestions[0])
              handleSuggestionClick(customerSuggestions[0]);
          }
        } else if (key === "Enter") {
          event.preventDefault();
          if (selectedCustomer) {
            if (usage === "ledger") handleTriggerFetch();
            else if (onSelect) onSelect(selectedCustomer);
          } else if (customerInput && count > 0 && customerSuggestions[0])
            handleSuggestionClick(
              customerSuggestions[0]
            ); // Should not happen if auto-select works
          else if (customerInput && usage === "ledger")
            setCustomerError("Please select a valid customer.");
        } else if (
          key === "ArrowDown" &&
          !popperOpen &&
          customerInput &&
          count > 0
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
        onSelect,
        setCustomerError,
      ]
    );

    const handleDateChange = useCallback(
      (e) => {
        setDates((prev) => ({ ...prev, [e.target.name]: e.target.value }));
        setDateRangeType("custom");
      },
      [setDates, setDateRangeType]
    );
    const handleClickAway = useCallback(() => {
      if (popperOpen) {
        setPopperOpen(false);
        setHighlightedIndex(-1);
      }
    }, [popperOpen]);
    const handleInputFocus = useCallback(() => {
      customerInputRef.current?.select();
      if (customerInput && customerSuggestions.length > 0) setPopperOpen(true);
    }, [customerInput, customerSuggestions.length]);
    const handleReset = useCallback(() => {
      if (onReset) onReset("");
      setSelectedCustomer(null);
      setCustomerInput("");
      setCustomerSuggestions([]);
      setPopperOpen(false);
      setHighlightedIndex(-1);
      setCustomerError(null);
      setDateRangeType("3-Months");
      if (onSelect) onSelect(null);
      customerInputRef.current?.focus();
    }, [
      onSelect,
      setCustomerInput,
      onReset,
      setSelectedCustomer,
      setCustomerError,
      setDateRangeType,
    ]);

    const isSearchButtonDisabled =
      customerLoading ||
      !selectedCustomer ||
      (masterCustomerList.length === 0 && !token && !customerLoading) ||
      !!customerError ||
      (usage === "ledger" && (!dates.startDate || !dates.endDate));
    const showInputError = !!customerError && !popperOpen;

    return (
      <Box>
        <Grid
          container
          spacing={2}
          marginY={usage === "ledger" ? 2 : 1}
          maxWidth={"xl"}
          sx={{ width: "100%" }}
        >
          <Grid item xs={12} sx={{ width: "100%" }}>
            <ClickAwayListener onClickAway={handleClickAway}>
              <Box sx={{ position: "relative", width: "100%" }}>
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="Customer"
                  value={customerInput ?? ''}
                  onChange={handleCustomerInputChange}
                  inputRef={customerInputRef}
                  onFocus={handleInputFocus}
                  onBlur={() => {
                    setTimeout(() => {
                      if (
                        document.activeElement !== customerInputRef.current &&
                        !listRef.current?.outerRef?.contains(
                          document.activeElement
                        )
                      )
                        setPopperOpen(false);
                    }, 150);
                  }}
                  onKeyDown={handleInputKeyDown}
                  error={showInputError}
                  helperText={showInputError ? customerError : null}
                  disabled={
                    (customerLoading &&
                      masterCustomerList.length === 0 &&
                      !token) ||
                    disabled
                  }
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        {customerLoading &&
                        masterCustomerList.length === 0 &&
                        !token ? (
                          <CircularProgress color="inherit" size={20} />
                        ) : (
                          <PersonIcon color="primary" />
                        )}
                      </InputAdornment>
                    ),
                    endAdornment: (customerInput || selectedCustomer) &&
                      !disabled && (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={handleReset}
                            edge="end"
                            size="small"
                            aria-label="clear input"
                            disabled={
                              customerLoading &&
                              masterCustomerList.length === 0 &&
                              !token
                            }
                          >
                            <RestartAltIcon />
                          </IconButton>
                        </InputAdornment>
                      ),
                  }}
                />
                <Popper
                  open={
                    popperOpen && customerSuggestions.length > 0 && !disabled
                  }
                  anchorEl={customerInputRef.current}
                  placement="bottom-start"
                  modifiers={[
                    { name: "flip", enabled: false },
                    {
                      name: "preventOverflow",
                      enabled: true,
                      options: { boundary: "viewport" },
                    },
                  ]}
                  sx={{
                    zIndex: 1300,
                    width: customerInputRef.current
                      ? `${customerInputRef.current.clientWidth}px`
                      : "auto",
                    minWidth: customerInputRef.current
                      ? `${Math.max(
                          300,
                          customerInputRef.current.clientWidth * 0.8
                        )}px`
                      : "300px",
                    maxWidth: "calc(100vw - 32px)",
                  }}
                >
                  <Paper
                    elevation={3}
                    sx={{ maxHeight: 300, overflowY: "auto" }}
                  >
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
              !customerError &&
              token && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 1, display: "flex", alignItems: "center" }}
                >
                  <ErrorOutlineIcon fontSize="small" sx={{ mr: 0.5 }} />
                  No customer data.
                </Typography>
              )}
          </Grid>
          {usage === "ledger" && (
            <Grid container item xs={12} spacing={2} alignItems="stretch">
              <Grid
                item
                xs={12}
                sm={dateRangeType === "custom" ? 12 : 6}
                md={dateRangeType === "custom" ? 3 : 4}
              >
                <FormControl
                  fullWidth
                  variant="outlined"
                  sx={{ height: "100%" }}
                >
                  <InputLabel id="date-range-label">Date Range</InputLabel>
                  <Select
                    labelId="date-range-label"
                    value={dateRangeType}
                    onChange={(e) => setDateRangeType(e.target.value)}
                    label="Date Range"
                    disabled={disabled}
                    startAdornment={
                      <InputAdornment position="start">
                        <EventIcon color="primary" />
                      </InputAdornment>
                    }
                    sx={{ height: "100%" }}
                  >
                    {allowedDateRangeOptions.map((opt) => (
                      <MuiMenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MuiMenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              {dateRangeType === "custom" && (
                <>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      label="Start Date"
                      name="startDate"
                      type="date"
                      variant="outlined"
                      value={dates.startDate}
                      onChange={handleDateChange}
                      InputLabelProps={{ shrink: true }}
                      disabled={disabled}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <EventIcon color="action" />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ height: "100%" }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      label="End Date"
                      name="endDate"
                      type="date"
                      variant="outlined"
                      value={dates.endDate}
                      onChange={handleDateChange}
                      InputLabelProps={{ shrink: true }}
                      disabled={disabled}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <EventIcon color="action" />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ height: "100%" }}
                    />
                  </Grid>
                </>
              )}
              <Grid
                item
                xs={12}
                sm={dateRangeType === "custom" ? 6 : 3}
                md={dateRangeType === "custom" ? 1.5 : 4}
              >
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<RestartAltIcon />}
                  onClick={handleReset}
                  disabled={
                    (customerLoading &&
                      masterCustomerList.length === 0 &&
                      !token) ||
                    disabled
                  }
                  sx={{ height: "56px" }}
                >
                  Reset
                </Button>
              </Grid>
              <Grid
                item
                xs={12}
                sm={dateRangeType === "custom" ? 6 : 3}
                md={dateRangeType === "custom" ? 1.5 : 4}
              >
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
                  disabled={isSearchButtonDisabled || ledgerLoading || disabled}
                  sx={{ height: "56px" }}
                  ref={searchButtonRef}
                >
                  {ledgerLoading ? "Searching..." : "Search"}
                </Button>
              </Grid>
            </Grid>
          )}
        </Grid>
      </Box>
    );
  }
);
export default LedgerSearchForm;
