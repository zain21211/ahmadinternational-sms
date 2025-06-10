import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import Fade from "@mui/material/Fade";
import { styled } from "@mui/material/styles";
import axios from "axios";
// import useLocation from "./hooks/geolocation"; // Removed unused hook
import { useLocalStorageState } from "./hooks/LocalStorage"; // Assuming this hook exists
import debounce from "lodash.debounce"; // Import debounce utility

import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton,
  FormControlLabel,
  Checkbox,
  Alert,
  Paper,
  Autocomplete,
  CircularProgress,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete"; // Added delete icon if needed later
import LedgerSearchForm from "./CustomerSearch"; // Assuming this component exists

const formatCurrency = (value) => {
  const num = Number(value);
  if (isNaN(num)) return "0.00";
  // Format to 0 decimal places for currency string, but keep as number for calculations
  // Use toLocaleString for thousands separators
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

// const customTextField = {
//                 width: { xs: "100%", md: "150px" }, // Control width
//                 "& .MuiOutlinedInput-root": {
//                   backgroundColor: overDue !== "0.00" ? "red" : "transparent", // Background color based on value
//                   "& fieldset": {
//                     borderColor: overDue !== "0.00" ? "red" : undefined, // Border color
//                   },
//                   "&:hover fieldset": {
//                     borderColor: overDue !== "0.00" ? "red" : undefined,
//                   },
//                   "&.Mui-focused fieldset": {
//                     borderColor: overDue !== "0.00" ? "red" : undefined,
//                   },
//                 },
//                 "& .Mui-disabled": {
//                   fontWeight: "bold",
//                 },
//               }

// --- Utility Functions ---
// Removed local debounce as lodash.debounce is imported now
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function makeWildcardRegex(filter) {
  if (!filter || filter.trim() === "") return null;

  const lowerFilter = filter.toLowerCase().trim();

  // Support both spaces and % as wildcards
  const terms = lowerFilter.split(/[%\s]+/).map(escapeRegExp);

  // Build: start with first term, then match rest anywhere in order
  const pattern = `^${terms[0]}.*` + terms.slice(1).join(".*");

  try {
    return new RegExp(pattern, 'i');
  } catch (e) {
    console.error("Invalid regex:", pattern, e);
    return null;
  }
}

const url = "http://100.122.80.93:3001/api";

const OrderForm = () => {
  console.log("OrderForm rendering or re-rendering");

  // --- State Variables ---
  const firstOptionRef = useRef(null);
  const [products, setProducts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [companyInputValue, setCompanyInputValue] = useState("");
  const [categoryInputValue, setCategoryInputValue] = useState("");
  const [loading, setLoading] = useState(false); // General loading for API calls
  const [initialDataLoading, setInitialDataLoading] = useState(true); // Specific for initial products/customers
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [token] = useState(localStorage.getItem("authToken"));
  const productInputRef = useRef(null);
  const customerInputRef = useRef(null);
  const [perAmount, setPerAmount] = useState(0)
  const companyInputRef = useRef(null);
  const [overDue, setOverDue] = useState(null);
  const [balance, setBalance] = useState(null);
  const quantityInputRef = useRef(null);
  const navigate = useNavigate();
  const [doc, setDoc] = useState(null);
  const [productInputValue, setProductInputValue] = useState("");
  const [viewDate, setViewDate] = useState(null);
  const user = JSON.parse(localStorage.getItem("user"));
  const [cost, setCost] = useState(0)
  const [profit, setProfit] = useState(0)

  // STATES MANAGED IN OrderForm (and localStorage)
  // Use a specific key for the selected customer OBJECT
  const [selectedCustomer, setSelectedCustomer] = useLocalStorageState(
    "orderFormSelectedCustomer",
    null
  );

  // Product/Order states
  const [selectedProduct, setSelectedProduct] = useLocalStorageState(
    "orderFormSelectedProduct",
    null
  );
  // orderQuantity is the quantity the user types
  const [orderQuantity, setOrderQuantity] = useLocalStorageState(
    "orderFormOrderQuantity",
    0
  );
  // quantity is the total quantity including scheme (orderQuantity + schPc)
  const [quantity, setQuantity] = useState(0); // Derived state, no need for LS state
  const [companyFilter, setCompanyFilter] = useLocalStorageState(
    "orderFormCompanyFilter",
    ""
  );
  const [orderItems, setOrderItems] = useLocalStorageState(
    "orderFormOrderItems",
    []
  );
  // Total amount and orderQuantity are derived, maybe no need for LS?
  // But keeping them for now if needed elsewhere or for quick display
  const [totalAmount, setTotalAmount] = useLocalStorageState(
    "orderFormTotalAmount",
    0
  );
  const [orderItemsTotalQuantity, setOrderItemsTotalQuantity] =
    useLocalStorageState("orderFormTotalQuantity", 0);

  const [discount1, setDiscount1] = useLocalStorageState(
    "orderFormDiscount1",
    0
  );
  const [discount2, setDiscount2] = useLocalStorageState(
    "orderFormDiscount2",
    0
  );
  // Store numeric price and calculate/store numeric amount
  const [price, setPrice] = useState(0); // Selected product's sale rate
  const [calculatedAmount, setCalculatedAmount] = useState(0); // Numeric amount for the current item
  const [vest, setVest] = useState(0); // Numeric vest value for the current item


  const [schPc, setSchPc] = useState(0); // Scheme pieces for current item
  const [scheme, setScheme] = useState(""); // Scheme text for current item
  const [categoryFilter, setCategoryFilter] = useLocalStorageState(
    "orderFormCategoryFilter",
    ""
  );
  const [suggestedPrice, setSuggestedPrice] = useState(
    selectedProduct?.SaleRate || 0
  ); // Suggested price for current item
  const [isClaim, setIsClaim] = useState(false); // Claim status for current item
  const [Sch, setSch] = useState(true); // Scheme applicability for current item (default true)
  const [productRemakes, setProductRemakes] = useState(""); // Remakes for current item

  // Date state (use YYYY-MM-DD format internally and for API)
  const [selectedDate, setSelectedDate] = useLocalStorageState(
    "orderFormSelectedDate",
    new Date().toISOString().split("T")[0] // Store as YYYY-MM-DD
  );

  // Calculate min and max dates (7 days before and after today)
  const today = useMemo(() => new Date(), []);
  const minDate = useMemo(() => {
    const d = new Date(today);
    // d.setDate(today.getDate() - 7); // Example: 7 days before today
    // Based on comment, perhaps just today is the min date?
    return d.toISOString().split("T")[0];
  }, [today]);
  const maxDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(today.getDate() + 7); // 7 days after today
    return d.toISOString().split("T")[0];
  }, [today]);

  const API_BASE_URL = "http://100.122.80.93:3001/api";

  // --- Debounced Update Functions ---
  const debouncedSetCompanyFilter = useCallback(
    debounce((value) => {
      setCompanyFilter(value);
      setSelectedProduct(null); // Clear selected product when filter changes
    }, 300), // Adjust debounce delay as needed
    []
  );

  const debouncedSetCategoryFilter = useCallback(
    debounce((value) => {
      setCategoryFilter(value);
      setSelectedProduct(null); // Clear selected product when filter changes
    }, 300), // Adjust debounce delay as needed
    []
  );

const BigTextField = styled(TextField)({
  "& .MuiInputBase-root": {
    fontSize: "1.4rem",
    width: "auto",
    minWidth: "150px",

  },
  "& .MuiInputBase-input": {
    fontWeight: "bold",         // Input text
    textAlign: "center",   
      letterSpacing: "1.5px", // 👈 adjust this value as needed     // Input text center
  },
  "& label": {
    fontSize: "1rem",
    fontWeight: "bold",         // Label normal
  },
  "& label.Mui-focused": {
    fontSize: "1.1rem",
    fontWeight: "bold",         // Label when focused
  },
  "& .MuiInputLabel-root": {
    transformOrigin: "top left",
  },
});


  // const handlePrint = async(){
  //   const responce
  // }
  // --- Effects ---
  const handlePrint = () => {
    window.print;
  };

  useEffect(() => {
    const getDoc = async () => {
      try {
        const response = await axios.get(`${url}/create-order/doc`, {
          params: {
            acid: selectedCustomer?.acid || "",
          },
        });
        const { nextDoc, date, total } = response.data;
        setDoc(nextDoc);
        setPerAmount(Math.round(total))
        setViewDate(date);
      } catch (error) {
        console.error(error);
      }
    };

    if(selectedCustomer){
      getDoc();
    }
  }, [selectedCustomer]);  


  
  // for fetch the Cost
  useEffect(() => {
    const getCost = async () => {
      try {
        const response = await axios.get(`${url}/create-order/cost`, {
          params: {
            ItemCode: selectedProduct?.code || "",
          },
        });
        const {cost} = response.data;

        setCost(cost)
      } catch (error) {
        console.error(error);
      }
    };


    if(selectedProduct){
      getCost();
    }
  }, [selectedProduct, API_BASE_URL]);

  useEffect(() => {
    console.log("calculating profit")
    function parseAmountString(amountStr) {
      console.log("the tyrpe ", typeof amountStr)
  if (typeof amountStr !== "string") return 0;

  // Remove all commas and parse as number
  const cleaned = amountStr.replace(/,/g, "");
  const number = parseFloat(cleaned);

  console.log("the number ", amountStr)
  console.log("new ", number)
  return isNaN(number) ? 0 : number;
}

    // Only calculate if all required values are present and valid 
    if (cost && orderQuantity) {
      console.log("calculatedAmount:", calculatedAmount, "quantity:", quantity, "cost:", cost);
      const net_profit = (((calculatedAmount ||0) / (quantity || 0)) - cost ) * (quantity || 0);
      setProfit(Math.round(net_profit));
      console.log("cost profit = ", net_profit)
    } else {
      setProfit(0);
    }
  }, [calculatedAmount, quantity, cost, API_BASE_URL]);

  // Effect to fetch customer balance and overdue based on selected customer and date
  useEffect(() => {
    const fetchCustomerFinancials = async () => {
      if (!selectedCustomer || !selectedCustomer.acid) {
        console.log("No customer selected for financial fetch.");
        setBalance(null);
        setOverDue(null);
        return;
      }

      setLoading(true); // Set loading specifically for this fetch
      setError(null); // Clear previous errors

      try {
        // Assuming balance API takes acid and date (YYYY-MM-DD format)
        const responseBal = await axios.get(`${API_BASE_URL}/balance`, {
          params: {
            acid: selectedCustomer.acid,
            date: selectedDate, // selectedDate is already YYYY-MM-DD
          },
          headers: { Authorization: `Bearer ${token}` }, // Add token
        });
        const { balance } = responseBal.data;
        setBalance(formatCurrency(Math.round(balance)));

        // Assuming overdue API takes acid and date (YYYY-MM-DD format)
        const responseOver = await axios.get(
          `${API_BASE_URL}/balance/overdue`,
          {
            params: {
              acid: selectedCustomer.acid,
              date: selectedDate, // selectedDate is already YYYY-MM-DD
            },
            headers: { Authorization: `Bearer ${token}` }, // Add token
          }
        );

        const { overDue } = responseOver.data;
        setOverDue(formatCurrency(Math.round(overDue)));
      } catch (err) {
        console.error("Error fetching customer financials:", err);
        setError(
          `Failed to load customer financials. ${
            err.response?.data?.message || err.message
          }`
        );
        setBalance(null);
        setOverDue(null);
      } finally {
        // Only turn off loading if *this* fetch is complete
        // Be careful if other operations also set 'loading'
        setLoading(false);
      }
    };

    // Fetch whenever selectedCustomer or selectedDate changes
    fetchCustomerFinancials();
  }, [selectedCustomer, selectedDate, API_BASE_URL, token]); // Added dependencies

  // Effect to fetch discount based on selected customer and product company
  useEffect(() => {
    const fetchDiscount = async () => {


      if (
        !selectedProduct &&
        !selectedCustomer ||
        !selectedCustomer?.acid ||
        !selectedProduct?.Company
      ) {

        setDiscount1(0);
        setDiscount2(0);
        return;
      }
      try {
        const response = await axios.get(`${API_BASE_URL}/discount`, {
          params: {
            acid: selectedCustomer.acid,
            company: selectedProduct.Company,
          },
          headers: { Authorization: `Bearer ${token}` }, // Add token
        });

        const { disc1P, discount } = response.data;
        setDiscount1(disc1P || 0);
        setDiscount2(discount || 0);
      } catch (error) {
        console.error(
          "Error fetching discount:",
          error.response?.data?.message || error.message || error
        );
        // Do not set error state here, just log and reset discounts
        setDiscount1(0);
        setDiscount2(0);
      }
  }
    // Fetch whenever selectedProduct, selectedCustomer, or API_BASE_URL changes
    fetchDiscount();
  }, [selectedProduct, selectedCustomer, API_BASE_URL, token]); // Added dependencies

  // Effect to fetch scheme slabs for the selected product
  useEffect(() => {
    const getSchSlabs = async () => {
      if (!selectedProduct || !selectedProduct.code) {
        setScheme("");
        return;
      }
      try {
        const response = await axios.get(`${API_BASE_URL}/scheme/all`, {
          params: {
            productCode: selectedProduct.code,
            date: new Date().toISOString().split("T")[0], // Pass current date in YYYY-MM-DD
          },
          headers: { Authorization: `Bearer ${token}` }, // Add token
        });

        const sch = response.data; // Assuming response.data is the scheme object

        const schemeText = `${sch.SchOn} + ${sch.SchPc}`;
        setScheme(schemeText);
        // if (Array.isArray(response.data) && response.data.length > 0) {
        //   // Format all applicable schemes into a readable string
        //    response.data
        //     .map((sch) => `${sch.SchOn} + ${sch.SchPc}`)
        //     .join(", ");
        // } else {
        //   setScheme("N/A"); // Indicate no scheme found
        // }
      } catch (err) {
        console.error(
          "Error while getting the slabs:",
          err.response?.data?.message || err.message || err
        );
        setScheme("Error fetching schemes"); // Indicate error
      }
    };

    getSchSlabs();
  }, [selectedProduct, API_BASE_URL, token]); // Added dependencies

  useEffect(() => {
    setSuggestedPrice(selectedProduct?.SaleRate);
  }, [selectedProduct]);
  // Effect to calculate scheme pieces (SchPc) based on orderQuantity and selected product
  useEffect(() => {
    const getSch = async () => {
      // Ensure product, quantity > 0, and scheme is applicable
      if (
        !selectedProduct ||
        !selectedProduct.code ||
        orderQuantity <= 0 ||
        !Sch
      ) {
        setSchPc(0); // Reset scheme pieces if conditions not met
        setQuantity(orderQuantity); // Total quantity is just order quantity
        return;
      }
      try {
        const response = await axios.get(`${API_BASE_URL}/scheme`, {
          params: {
            productCode: selectedProduct.code,
            orderQty: orderQuantity,
            date: new Date().toISOString().split("T")[0], // Pass current date
          },
          headers: { Authorization: `Bearer ${token}` }, // Add token
        });

        const { SchOn, SchPc: calculatedSchPc } = response.data; // Renamed SchPc to avoid conflict
        let pcs = 0;
        if (SchOn > 0) {
          // Ensure SchOn is positive to avoid division by zero
          pcs =
            Math.floor(Number(orderQuantity) / Number(SchOn)) *
            Number(calculatedSchPc);
          // Use Math.floor if scheme applies per block (e.g., buy 10 get 1, buying 25 gets 2, not 2.5)
        }
        setSchPc(pcs);
        setQuantity(orderQuantity + pcs); // Total quantity = ordered + scheme pieces
      } catch (err) {
        console.error(
          "Error while getting the calculated scheme pieces:",
          err.response?.data?.message || err.message || err
        );
        // Do not set error state here, just log and reset scheme pieces
        setSchPc(0); // Reset on error
        setQuantity(orderQuantity); // Total quantity is just order quantity
      }
    };

    // Recalculate when orderQuantity, selectedProduct, or Sch flag changes
    getSch();
  }, [orderQuantity, selectedProduct, Sch]); // Added dependencies

  // Effect to calculate price, vest, and amount for the current item
  useEffect(() => {
    const currentPrice = selectedProduct?.SaleRate ?? 0;
    setPrice(currentPrice); // Set price state for display

    const numericOrderQuantity = Number(orderQuantity) || 0; // Ensure number, default to 0
    const numericPrice = Number(currentPrice) || 0; // Ensure number, default to 0
    const numericDiscount1 = Number(discount1) || 0;
    const numericDiscount2 = Number(discount2) || 0;

    // Calculate Vest: Order Quantity * Price
    const calculatedVest = numericOrderQuantity * numericPrice;
    setVest(calculatedVest); // Store numeric Vest

    // Calculate Total Item Amount after discount
    const totalDiscountPercentage = (numericDiscount1 + numericDiscount2) / 100;
    const discountAmount = calculatedVest * totalDiscountPercentage;
    const finalAmount = calculatedVest - discountAmount;

    setCalculatedAmount(finalAmount); // Store numeric calculated amount

  }, [orderQuantity, selectedProduct, discount1, discount2]); // Recalculate when these change

  // Effect to fetch initial product and company data
  useEffect(() => {
    if (!token) {
      setError("Authentication token not found. Please log in.");
      setInitialDataLoading(false);
      setLoading(false);
      return;
    }

    const fetchInitialData = async () => {
      console.log("Fetching initial data...");
      setInitialDataLoading(true);
      setError(null);
      setSuccess(null); // Clear success message on new load

      try {
        const headers = { Authorization: `Bearer ${token}` };
        // Fetch products, companies, and categories in parallel if separate endpoints exist
        // Or derive them from the products response if that's the case.
        // Assuming /products returns everything needed.
        const prodResponse = await axios.get(`${API_BASE_URL}/products`, {
          headers,
        });

        const allProducts = prodResponse.data || [];
        const cleanedProducts = allProducts
          .map((p) => ({
            ...p,
            Name: p.Name ? String(p.Name).trim() : "",
            Company: p.Company ? String(p.Company).trim() : "",
            Category: p.Category ? String(p.Category).trim() : "",
            SaleRate: p.SaleRate ?? 0,
            ID: p.ID, // Use ID consistently
            code: p.code, // Ensure code is available for scheme lookups
            StockQty: p.StockQty ?? 0, // Ensure StockQty is available
          }))
          .filter((p) => p.ID != null && p.Name && p.Name.trim() !== ""); // Filter out invalid items

        setProducts(cleanedProducts);

        // COMPANIES: Derive from cleaned products
        const uniqueCompanies = [
          ...new Set(cleanedProducts.map((p) => p.Company).filter(Boolean)),
        ].sort();
        setCompanies(uniqueCompanies);

        // CATEGORIES: Derive from cleaned products
        const uniqueCategories = [
          ...new Set(cleanedProducts.map((p) => p.Category).filter(Boolean)),
        ].sort();
        setCategories(uniqueCategories);
      } catch (err) {
        console.error(
          "Error fetching initial data:",
          err.response?.data?.message || err.message || err
        );
        setError(
          `Failed to load initial data. ${
            err.response?.data?.message || err.message
          }`
        );
        setProducts([]);
        setCompanies([]);
        setCategories([]);
      } finally {
        setInitialDataLoading(false);
        setLoading(false);
        console.log("Finished fetching initial data.");
      }
    };

    fetchInitialData();
  }, [token, API_BASE_URL]); // Added dependencies

  // Effect to recalculate total amount and total quantity whenever orderItems changes
  useEffect(() => {
    const newTotalAmount = orderItems.reduce((sum, item) => {
      // item.amount is already numeric here
      return sum + (Number(item.amount) || 0); // Ensure numeric and default to 0 for safety
    }, 0);
    const newTotalQuantity = orderItems.reduce((sum, item) => {
      return sum + (Number(item.quantity) || 0);
    }, 0);

    setTotalAmount(newTotalAmount);
    setOrderItemsTotalQuantity(newTotalQuantity);
  }, [orderItems]);

  const filteredAutocompleteOptions = useMemo(() => {
    if (initialDataLoading) {
      return [];
    }

    let filtered = [...products];

    // Filter by Company
    if (companyFilter && companyFilter.trim() !== "") {
      const companyRegex = makeWildcardRegex(companyFilter);
      if (companyRegex) {
        filtered = filtered.filter(
          (p) => p.Company && companyRegex.test(p.Company.toLowerCase())
        );
      } else {
        if (companyFilter.trim()) filtered = []; // Invalid pattern
      }
    }

    // Filter by Category (Model)
    if (categoryFilter && categoryFilter.trim() !== "") {
      const categoryRegex = makeWildcardRegex(categoryFilter, "model");
      if (categoryRegex) {
        filtered = filtered.filter(
          (p) => p.Category && categoryRegex.test(p.Category.toLowerCase())
        );
      } else {
        if (categoryFilter.trim()) filtered = []; // Invalid pattern
      }
    }

      console.log('before triming = ', productInputValue)

    // Filter by product name typed in autocomplete
    if (productInputValue.trim()) {
      const nameRegex = makeWildcardRegex(productInputValue, "product");
      console.log('afetr triming = ', nameRegex)
      if (nameRegex) {
        filtered = filtered.filter(
          (p) => p.Name && nameRegex.test(p.Name.toLowerCase())
        );
        console.log("the options", filtered)
      } else {
        return []; // Invalid pattern
      }
    }

    return filtered;
    // Memoize based on products, filters, and input value
  }, [
    products,
    companyFilter,
    categoryFilter,
    productInputValue,
    initialDataLoading,
  ]);

  // --- Event Handlers ---
  useEffect(() => {
    console.log("Profit changed:", profit);
  }, [profit]);

  // Handler for when a customer is selected from LedgerSearchForm
  const handleSelectCustomer = useCallback((customer) => {
    // Store the selected customer object in OrderForm state (and LS)
    setSelectedCustomer(customer);
    // If a customer is selected, attempt to focus the company input or product input
    if (customer) {
      // Clear any previous product/filters when customer changes? Depends on UX desired.
      // Maybe keep filters/product to re-add items for this customer? Let's keep them for now.
      // Focus the first relevant input
      companyInputRef.current?.focus();
    }
  }, []); // setSelectedCustomer is stable

  const handleEnterkey = (e) => {
    // Only handle "Enter" key
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddProduct();
    }
  };

  const handleLedgerClick = useCallback(() => {
    if (!selectedCustomer || !selectedCustomer.acid || !selectedDate) {
      // Maybe show an alert or error message
      setError("Please select a customer and a date to view the ledger.");
      return;
    }

    // Construct URL using selectedCustomer.acid and selectedCustomer.name, and dates
    // Use selectedDate directly (it's YYYY-MM-DD) for constructing date range for ledger API if needed
    // The LedgerSearchForm component handles date range calculation internally based on type
    // But if the ledger page itself needs specific start/end dates, calculate them here.
    // Based on the previous code, it seems the ledger page uses dates calculated relative to the selectedDate.
    const endDateObj = new Date(selectedDate);
    const startDateObj = new Date(selectedDate);
    startDateObj.setMonth(startDateObj.getMonth() - 3);

    // Format dates as YYYY-MM-DD for the URL params
    const ledgerStartDate = startDateObj.toISOString().split("T")[0];
    const ledgerEndDate = endDateObj.toISOString().split("T")[0];

    // Construct the URL for the ledger page
    const url = `/ledger?name=${encodeURIComponent(
      selectedCustomer.name || ""
    )}&acid=${encodeURIComponent(
      selectedCustomer.acid
    )}&startDate=${encodeURIComponent(
      ledgerStartDate
    )}&endDate=${encodeURIComponent(ledgerEndDate)}`;

    // Use navigate or window.open depending on desired behavior
    // window.open(url, "_blank"); // Open in new tab
    navigate(url); // Navigate within the app (might need react-router setup)
  }, [selectedCustomer, selectedDate, navigate]); // Added navigate dependency

  const handleAddProduct = useCallback(() => {
    setError(null);
    setSuccess(null);

    // Input validation before adding
    if (!selectedCustomer || !selectedCustomer.acid) {
      setError("Please select a customer first.");
      console.error("Add product failed: No customer selected.");
      return;
    }
    if (!selectedProduct || !selectedProduct.ID) {
      setError("Please select a product from the list.");
      console.error(
        "Add product failed: No product selected or product has no ID."
      );
      return;
    }
    // Validate quantity
    if (orderQuantity < 1) {
      setError("Please specify a valid quantity (at least 1).");
      console.error("Add product failed: Invalid quantity.");
      return;
    }

    console.log("this si the profit ", profit)

    // Add the product to orderItems
    const newItem = {
      productID: selectedProduct.ID,
      customerID: selectedCustomer.acid, // Add customer ID to item for clarity/payload
      name: selectedProduct.Name,
      company: selectedProduct.Company,
      model: selectedProduct.Category,
      orderQuantity: Number(orderQuantity), // The quantity the user entered
      schPc: Number(schPc) || 0, // Calculated scheme pieces
      quantity: Number(quantity) || 0, // Total quantity (order + scheme)
      rate: Number(selectedProduct.SaleRate) ?? 0, // Product's sale rate
      suggestedPrice: Number(suggestedPrice) || 0, // User's suggested price
      vest: Number(vest) || 0, // Calculated vest
      discount1: Number(discount1) || 0, // Discount 1 percentage
      discount2: Number(discount2) || 0, // Discount 2 percentage
      amount: Number(calculatedAmount) || 0, // Final calculated numeric amount for the item
      isClaim: isClaim,
      Sch: Sch,
       profit: profit,
      remakes: productRemakes.trim(), // Add remakes
    };

    console.log("this is order item ", orderItems)
    setOrderItems((prev) => [...prev, newItem]);

    // Reset item-specific states after adding
    setSelectedProduct(null);
    setOrderQuantity(0);
    setSchPc(0);
    setQuantity(0); // Reset derived quantity
    setDiscount1(0); // Reset discounts (unless they apply per customer/company consistently?)
    setDiscount2(0); // Reset discounts
    setPrice(0); // Reset price
    setSuggestedPrice(0); // Reset suggested price
    setVest(0); // Reset vest
    setCalculatedAmount(0); // Reset amount
    setIsClaim(false); // Reset claim checkbox
    setSch(true); // Reset scheme checkbox
    setProductRemakes(""); // Reset remakes

    // Maybe refocus product input after adding
    // Using a timeout because state updates might cause re-renders that steal focus
    setTimeout(() => {
      productInputRef.current?.focus();
    }, 50);
  }, [
    selectedCustomer,
    selectedProduct,
    orderQuantity,
    orderItems,
    schPc,
    quantity,
    discount1,
    discount2,
    price,
    suggestedPrice,
    vest,
    calculatedAmount,
    isClaim,
    Sch,
    profit,
    productRemakes,
    selectedProduct?.StockQty,
  ]); // Added dependencies

  const thisAmount = totalAmount

  const handleRemoveProduct = useCallback((indexToRemove) => {
    console.log("handleRemoveProduct at index:", indexToRemove);
    setOrderItems((prev) => prev.filter((_, i) => i !== indexToRemove));
  }, []); // No dependencies needed

  const handlePostOrder = async () => {
 
    setError(null); // Clear previous errors
    setSuccess(null); // Clear previous success messages

    // Final validation before posting
    if (!selectedCustomer || !selectedCustomer.acid) {
      setError("Please select a customer before posting the order.");
      console.error("Post order failed: No customer selected.");
      return;
    }

    if (orderItems.length === 0) {
      setError("Cannot post an empty order. Please add at least one product.");
      console.error("Post order failed: No items in order.");
      return;
    }

    setLoading(true); // Set general loading for this operation

    orderItems.map(item =>{

      console.log("this the item profit ", item.profit)
    })
    try {
      const payload = {
        doc,
        products: orderItems.map((item) => ({
          date: selectedDate, // Use the date in YYYY-MM-DD format
          acid: String(selectedCustomer.acid), // Ensure acid is string
          type: "SALE", // Assuming type is always SALE
          qty: Number(item.orderQuantity), // Ordered quantity
          aQty: Number(item.orderQuantity), // Appears to be same as qty? Confirm API needs
          bQty: Number(item.quantity), // Total quantity (including scheme)
          rate: Number(item.rate),
          suggestedPrice: Number(item.suggestedPrice),
          vest: Number(item.vest),
          discP1: Number(item.discount1), // Percentage discount 1
          discP2: Number(item.discount2), // Percentage discount 2
          // 'vist' seems like a typo or misnaming for the final item amount
          // Use the calculated numeric amount from item.amount
          vist: Number(item.amount),
          SchPc: Number(item.schPc) || 0,
          sch: Boolean(item.Sch), // Ensure boolean
          isClaim: Boolean(item.isClaim), // Ensure boolean
          prid: String(item.productID) || "0", // Ensure product ID is string, default to '0' if null/undefined
          profit: item.profit,
          remakes: item.remakes || "", // Include remakes
        })),
        // Add other top-level order details if API expects them (e.g., CustomerID, Date, Location, User)
        orderDate: selectedDate,
        customerAcid: String(selectedCustomer.acid),
        userId: user?.UserID, // Assuming user object has UserID// Use coords if location hook was active
        // Add any other required fields like total amount, total quantity etc.
        totalAmount: doc ? Number(totalAmount + perAmount) : totalAmount,
        totalQuantity: Number(orderItemsTotalQuantity),
      };

      console.log("Posting order with payload:", payload);

      const response = await axios.post(
        `${API_BASE_URL}/create-order`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log("Order post response:", response.data);

      // Handle success
      setSuccess(response.data.message || "Order created successfully!");

      // Clear form/state after successful post
      setOrderItems([]);
      setSelectedCustomer(null); // Clear selected customer (updates LS via hook)
      setSelectedProduct(null);
      setCompanyFilter(""); // Clear filters (updates LS)
      setCategoryFilter(""); // Clear filters (updates LS)
      setCompanyInputValue(""); // Clear input text
      setCategoryInputValue(""); // Clear input text
      setProductInputValue(""); // Clear input text
      setOrderQuantity(0); // Clear quantity (updates LS)
      setSchPc(0); // Clear scheme pieces
      setQuantity(0); // Clear total quantity
      setPrice(0); // Clear price
      setSuggestedPrice(0); // Clear suggested price
      setVest(0); // Clear vest
      setCalculatedAmount(0); // Clear amount
      setDiscount1(0); // Clear discounts (updates LS)
      setDiscount2(0); // Clear discounts (updates LS)
      setIsClaim(false); // Reset checkboxes
      setSch(true); // Reset checkboxes
      setProductRemakes(""); // Clear remakes
      setBalance(null); // Clear customer financials
      setOverDue(null); // Clear customer financials
      setTotalAmount(0); // Clear derived totals (updates LS)
      setOrderItemsTotalQuantity(0); // Clear derived totals (updates LS)
    } catch (err) {
      console.error(
        "Order creation failed:",
        err.response?.data || err.message || err
      );
      setError(
        err.response?.data?.message ||
          "Failed to create order. Please check details and try again."
      );
      // Keep the order items in state so the user doesn't lose their work if post fails
    } finally {
      setLoading(false); // Turn off loading regardless of success/failure
    }
  };

  useEffect(() => {
    if (selectedCustomer !== ("" || undefined || null)) {
      companyInputRef.current?.focus();
    }
  }, [selectedCustomer]);

  // Handle date change - store the YYYY-MM-DD string value
  const handleDateInputChange = (e) => {
    setSelectedDate(e.target.value); // Store the YYYY-MM-DD string directly
  };

  const handleCheckBox = (event, field) => {
    const checked = event.target.checked;
    if (field === "sch") {
      setSch(checked);
    } else if (field === "isClaim") {
      setIsClaim(checked);
    }
  };

  const getNoOptionsText = () => {
    if (initialDataLoading) return "Loading products...";
    if (!products.length) return "No products available.";
    if (productInputValue.length < 2) return "Type at least 2 letters";
    if (
      (companyFilter || categoryFilter || productInputValue.trim()) &&
      filteredAutocompleteOptions.length === 0
    )
      return "No products match filters.";

    return "No matching products found.";
  };

  // Stock availability check for input field border color
  const hasStock = selectedProduct
    ? (selectedProduct.StockQty ?? 0) >= orderQuantity
    : true; // Assume stock is OK if no product selected

  return (
    <Container
      sx={{
        "@media (max-width:600px)": {
          all: "unset",
        },
      }}
      maxWidth="xl" // Use max width from MUI
    >
      {/* Error and Success Alerts */}
      {(success || error) && (
        <Box sx={{ my: 2 }}>
          <Fade in={!!error}>
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          </Fade>
          <Fade in={!!success}>
            <Alert severity="success" onClose={() => setSuccess(null)}>
              {success}
            </Alert>
          </Fade>
        </Box>
      )}

      <Box
        sx={{
          mb: 2,
          display: "grid",
          gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(9, 1fr)" }, // Adjusted grid for small screens
          alignItems: "center",
          gap: 2,
        }}
      >
        {/* Customer Search */}
        <Box
          sx={{
            gridColumn: {
              xs: "span 2", // Full width on xs
              sm: selectedCustomer ? "span 5" : "span 7",
              md: selectedCustomer ? "span 6" : "span 8",
              xl: selectedCustomer ? "span 6" : "span 8",
            },
            minWidth: { xs: "auto", sm: 250 }, // Allow auto width on xs
          }}
        >
          <LedgerSearchForm
            usage="orderForm"
            // Pass the handler to receive the selected customer OBJECT
            onSelect={handleSelectCustomer}
            // Pass the name of the selected customer object for initial display sync
            name={selectedCustomer?.name || ""}
            // Indicate general loading state from OrderForm
            loading={loading || initialDataLoading}
            inputRef={customerInputRef}
            disabled={orderItems.length > 0} // Disable if items already added
          />
        </Box>

        {/* Ledger Button — only if customer is selected */}
        {selectedCustomer && (
          <Box
            sx={{
              gridColumn: {
                xs: "span 1", // Half width on xs
                sm: "span 2",
                md: "span 2",
                xl: "span 2",
              },
              height: { xs: "56px", sm: "77%" }, // Adjust height for small screens
            }}
          >
            <Button
              onClick={handleLedgerClick}
              variant="contained"
              color="primary"
              fullWidth
              sx={{
                height: "100%", // Make button fill container height
                transition: "background-color 0.3s, color 0.3s",
                "&:hover": {
                  backgroundColor: "primary.dark", // Darker shade on hover
                  color: "white",
                  borderColor: "primary.dark",
                },
              }}
            >
              LEDGER
            </Button>
          </Box>
        )}

        {/* Date Picker */}
        <Box
          sx={{
            gridColumn: {
              xs: "span 1", // Half width on xs
              sm: "span 2",
              md: "span 1",
            },
            minWidth: { xs: "auto", sm: 150 }, // Allow auto width on xs
          }}
        >
          <TextField
            fullWidth // Make date picker full width in its grid item
            type="date"
            label="Select Date"
            value={selectedDate} // Use the YYYY-MM-DD string state
            onChange={handleDateInputChange} // Use the corrected handler
            InputLabelProps={{ shrink: true }}
            inputProps={{
              min: minDate,
              max: maxDate,
            }}
          />
        </Box>
      </Box>

      {/* Customer Financials Display */}
      {/* Only show if a customer is selected */}
      {selectedCustomer && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(auto-fit, minmax(150px, 1fr))", // Responsive grid for financials
              md: "repeat(3, auto)", // Auto width for md and above
            },
            gap: 2, // Consistent gap
            justifyContent: "flex-start", // Align items to start
            mb: 2,
            alignItems: "center",
          }}
        >
          {/* FOR balance */}
          {balance !== null && ( // Only render if balance is not null
            <BigTextField
              label="BALANCE"
              type="string"
              value={balance}
              disabled
              onFocus={(e) => e.target.select()}
              InputLabelProps={{ shrink: true }}
              sx={{
                width: { xs: "100%", md: "150px" }, // Control width
                "& .Mui-disabled": {
                  fontWeight: "bold",
                  textAlign: "right",
                  WebkitTextFillColor: "black !important",
                },
              }}
            />
          )}

          {/* FOR OVERDUE */}
          {overDue !== null && ( // Only render if overdue is not null
            <BigTextField
              label="OVERDUE"
              type="string"
              disabled
              fullWidth
              value={overDue}
              InputLabelProps={{
                shrink: true,
                sx: {
                  color: "black !important", // label color
                  fontWeight: "bold !important", // bold label
                  backgroundColor: "white !important",
                  paddingRight: 2,
                  paddingLeft: "7px",
                  borderRadius: "4px",
                  fontSize: "1rem", // optional: change size
                },
              }}
              InputProps={{
                sx: {
                  "& input.Mui-disabled": {
                    WebkitTextFillColor:
                      overDue !== "0.00" ? "white" : "black !important", // Text color based on value
                    textAlign: "right",
                  },
                },
              }}
              sx={{
                width: { xs: "100%", md: "150px" }, // Control width
                "& .MuiOutlinedInput-root": {
                  backgroundColor: overDue !== "0.00" ? "red" : "transparent", // Background color based on value
                  "& fieldset": {
                    borderColor: overDue !== "0.00" ? "red" : undefined, // Border color
                  },
                  "&:hover fieldset": {
                    borderColor: overDue !== "0.00" ? "red" : undefined,
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: overDue !== "0.00" ? "red" : undefined,
                  },
                },
                "& .Mui-disabled": {
                  fontWeight: "bold",
                },
              }}
            />
          )}

          {/* for doc */}
          {doc !== null && ( // Only render if overdue is not null
          <BigTextField
            label=" ESTIMATE #"
            value={doc}
            InputProps={{
                sx: {
                    color:
                      doc !== "0.00" ? "white" : "black !important", // Text color based on value
                },
              }}
            InputLabelProps={{ shrink: true,
              sx: {
                  color: "black !important", // label color
                  fontWeight: "bold !important", // bold label
                  backgroundColor: "white !important",
                  paddingRight: 2,
                  paddingLeft: "7px",
                  borderRadius: "4px",
                  fontSize: "1rem", // optional: change size
                },
             }}
            variant="outlined"
            onChange={e => setDoc(e.target.value)}
            onFocus={(e) => e.target.select()}
            sx={{
                width: { xs: "100%", md: "150px" }, // Control width
                "& .MuiOutlinedInput-root": {
                  backgroundColor: overDue !== "0.00" ? "green" : "transparent", // Background color based on value
                  "& fieldset": {
                    borderColor: overDue !== "0.00" ? "green" : undefined, // Border color
                  },
                  "&:hover fieldset": {
                    borderColor: doc !== "0.00" ? "green" : undefined,
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: overDue !== "0.00" ? "green" : undefined,
                  },
                },
                "& .Mui-disabled": {
                  fontWeight: "bold",
                },
              }}
          />
)}
          {/* Add Past Payment field here if needed */}
        </Box>
      )}

      <Paper
        sx={{ p: 2, mb: 3, opacity: loading || initialDataLoading ? 0.7 : 1 }}
      >
        <Typography variant="h6" sx={{ mb: 2 }}>
          Add Products
        </Typography>

        <Box
          sx={{
            display: "grid",
            // Adjusted grid columns for different screen sizes
            gridTemplateColumns: {
              xs: "repeat(4, 1fr)", // 2 columns on extra small
              sm: "repeat(3, 1fr)", // 3 columns on small
              md: "repeat(auto-fit, minmax(100px, 1fr))", // Flexible columns on md and above
              lg: "repeat(11, auto)", // Specific columns for large+ if needed, adjust as necessary
            },
            gap: 2,
            mb: 2,
            alignItems: "center",
          }}
        >
          {/* FOR COMPANY */}
          <Autocomplete
            freeSolo
            options={companies || []}
            inputRef={companyInputRef}
            getOptionLabel={(option) => option || ""}
            value={companyFilter} // Controlled by debounced filter state
            inputValue={companyInputValue} // For immediate input text display
            onInputChange={(event, newInputValue, reason) => {
              setCompanyInputValue(newInputValue);
              if (reason === "input") {
                debouncedSetCompanyFilter(newInputValue); // Update filter state after debounce
              } else if (reason === "clear") {
                debouncedSetCompanyFilter(""); // Clear filter immediately on clear
                setCompanyInputValue(""); // Clear input immediately
              }
              // If reason is 'reset' or 'blur', value/inputvalue sync happens automatically
            }}
            onChange={(event, newValue) => {
              console.log("Company Autocomplete onChange, newValue:", newValue);
              // When an option is selected or entered, update filter and input immediately
              setCompanyFilter(newValue || "");
              setCompanyInputValue(newValue || "");
              setSelectedProduct(null); // Clear selected product
            }}
            renderInput={(params) => (
              <TextField {...params} label="Company" variant="outlined" />
            )}
            sx={{ gridColumn: { xs: "span 2", sm: "span 1", md: "auto" } }} // Adjust grid span
            disabled={loading || initialDataLoading}
            loading={initialDataLoading && !companies.length}
          />

          {/* FOR MODEL (Category) */}
          <Autocomplete
            freeSolo
            options={categories || []}
            getOptionLabel={(option) => option || ""}
            value={categoryFilter}
            inputValue={categoryInputValue}
            onInputChange={(event, newInputValue, reason) => {
              setCategoryInputValue(newInputValue);
              if (reason === "input") {
                debouncedSetCategoryFilter(newInputValue);
              } else if (reason === "clear") {
                debouncedSetCategoryFilter("");
                setCategoryInputValue("");
              }
            }}
            onChange={(event, newValue) => {
              console.log(
                "Category Autocomplete onChange, newValue:",
                newValue
              );
              setCategoryFilter(newValue || "");
              setCategoryInputValue(newValue || "");
              setSelectedProduct(null);
            }}
            renderInput={(params) => (
              <TextField {...params} label="Model" variant="outlined" />
            )}
            sx={{ gridColumn: { xs: "span 2", sm: "span 1", md: "auto" } }} // Adjust grid span
            disabled={loading || initialDataLoading}
            loading={initialDataLoading && !categories.length}
          />

          {/* Scheme/Claim Checkboxes - Grouped */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center", // Center checkboxes vertically
              gridColumn: { xs: "span 1", sm: "span 1", md: "auto" }, // Adjust grid span
              minWidth: "100px", // Give minimum width
            }}
          >
            <FormControlLabel
              control={
                <Checkbox
                  checked={Sch}
                  onChange={(e) => handleCheckBox(e, "sch")}
                  name="sch"
                />
              }
              label="Scheme"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={isClaim}
                  onChange={(e) => handleCheckBox(e, "isClaim")}
                  name="isClaim"
                />
              }
              label="Claim"
            />
          </Box>

          {/* FOR PRODUCT */}
          <Autocomplete
            // Require at least 2 characters before showing suggestions
            options={
              productInputValue.length < 2 ? [] : filteredAutocompleteOptions
            }
            filterOptions={(options) => options}

            getOptionLabel={(option) => option?.Name || ""}
            isOptionEqualToValue={(option, value) => option?.ID === value?.ID}
            inputValue={productInputValue}
            value={selectedProduct}
            onInputChange={(event, newInputValue) => {
              // Always update product input value state immediately
              setProductInputValue(newInputValue);
              // If input value changes and it doesn't match the currently selected product's name,
              // deselect the product state. This keeps selectedProduct in sync with input text.

              if (selectedProduct && selectedProduct.Name !== newInputValue) {
                setSelectedProduct(null);
              }
            }}
            onChange={(event, newValue) => {
              // When a suggestion is selected (newValue is an object)
              setSelectedProduct(newValue);
              // Also update the input value state to match the selected item's name
              setProductInputValue(newValue?.Name || "");
              // Reset quantity and error when a new product is selected
              setOrderQuantity(0);
              setError(null);
              setTimeout(() => {
                quantityInputRef.current?.focus();
              }, 100);
            }}
            renderOption={(props, option, state) => {
              // Use option.ID as the key for react list rendering
              return (
                <Box component="li" {...props} key={option.ID}>
                  <ListItemText
                    sx={{ borderBottom: "1px solid #eee" }}
                    primary={option.Name}
                    secondary={`Rate: ${
                      option.SaleRate != null
                        ? option.SaleRate.toFixed(0)
                        : "N/A"
                    } | Co: ${option.Company || "-"} | Cat: ${
                      option.Category || "-"
                    }`}
                    primaryTypographyProps={{ noWrap: true }}
                    secondaryTypographyProps={{ noWrap: true }}
                  />
                </Box>
              );
            }}
            slotProps={{
              popper: {
                sx: { minWidth: 350, width: "auto !important" },
              },
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select Product"
                variant="outlined"
                inputRef={productInputRef}
                InputProps={{
                  ...params.InputProps,
                  // Apply styling based on isClaim state directly on the InputProps sx
                  sx: {
                    ...params.InputProps.sx, // Keep existing sx styles
                    color: isClaim ? "white" : undefined,
                    backgroundColor: isClaim ? "red" : undefined,
                    ".MuiOutlinedInput-notchedOutline": {
                      // Style border
                      borderColor: isClaim ? "red !important" : undefined,
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: isClaim ? "darkred !important" : undefined,
                    },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      borderColor: isClaim ? "darkred !important" : undefined,
                    },
                  },
                }}
                InputLabelProps={{
                  ...params.InputLabelProps,
                  sx: {
                    ...params.InputLabelProps?.sx, // Keep existing sx styles
                    color: isClaim ? "white" : undefined, // Label color based on isClaim
                  },
                }}
                onKeyDown={(e) => {
                  // Handle Enter or Tab when no product is selected but input might match first suggestion
                  if (
                    (e.key === "Enter" || e.key === "Tab") &&
                    !selectedProduct
                  ) {
                    // If there are suggestions and the first one is valid
                    if (
                      filteredAutocompleteOptions.length > 0 &&
                      filteredAutocompleteOptions[0]?.ID != null
                    ) {
                      setSelectedProduct(filteredAutocompleteOptions[0]); // Select the first suggestion
                      setProductInputValue(
                        filteredAutocompleteOptions[0].Name || ""
                      ); // Update input value
                      e.preventDefault(); // prevent default form submit or tab focus
                    }
                  } else if (
                    (e.key === "Enter" || e.key === "Tab") &&
                    selectedProduct
                  ) {
                    // If Enter or Tab is pressed and a product IS selected, focus the quantity field
                    e.preventDefault();
                    quantityInputRef.current?.focus();
                  }
                }}
              />
            )}
            sx={{ gridColumn: { xs: "span 3", sm: "span 3", md: "span 2" } }} // Adjust grid span
            disabled={loading || initialDataLoading}
            loading={initialDataLoading && !products.length}
            noOptionsText={getNoOptionsText()}
          />

          {/* FOR orderQty (Ordered Quantity) */}
          <TextField
            label="Qty"
            type="number"
            value={orderQuantity || ""} // Use '' for 0 to show empty initially or when 0
            inputRef={quantityInputRef}
            onFocus={(e) => e.target.select()}
            onKeyDown={(e) => handleEnterkey(e)}
            onChange={(e) => {
              // Ensure input is a non-negative integer
              const value = parseInt(e.target.value, 10);
              setOrderQuantity(Math.max(0, value || 0)); // Set to 0 if NaN or negative
            }}
            sx={{
              gridColumn: { xs: "span 1", sm: "span 1", md: "auto" }, // Adjust grid span
              width: { xs: "100%", md: "100px" },
              "& .MuiOutlinedInput-root": {
                "& fieldset": {
                  // Apply border color based on stock check only when input is not disabled and product is selected
                  borderColor:
                    !isClaim && selectedProduct
                      ? hasStock
                        ? "green"
                        : "red"
                      : undefined,
                },
                // Add hover/focus states matching the static state
                "&:hover fieldset": {
                  borderColor:
                    !isClaim && selectedProduct
                      ? hasStock
                        ? "darkgreen"
                        : "darkred"
                      : undefined,
                },
                "&.Mui-focused fieldset": {
                  borderColor:
                    !isClaim && selectedProduct
                      ? hasStock
                        ? "darkgreen"
                        : "darkred"
                      : undefined,
                },
              },
              // Ensure text color remains black even when border is colored
              "& input": {
                color: "black !important",
              },
            }}
            disabled={loading || initialDataLoading || !selectedProduct} // Disable if no product selected
            inputProps={{ min: 0 }} // Ensure minimum is 0
          />

          {/* FOR FOC (Scheme Pieces) */}
          <TextField
            label="FOC"
            type="number"
            disabled
            value={Math.round(schPc) || 0}
            sx={{
              gridColumn: { xs: "span 1", sm: "span 1", md: "auto" }, // Adjust grid span
              width: { xs: "100%", md: "100px" },
              "& .Mui-disabled": {
                fontWeight: "bold",
                WebkitTextFillColor: "black !important",
              },
            }}
          />

          {/* FOR QUANTITY (Total Quantity Qty + FOC) */}
          <TextField
            label="TQ"
            type="number"
            disabled
            value={Math.round(quantity) || 0}
            sx={{
              gridColumn: { xs: "span 1", sm: "span 1", md: "auto" }, // Adjust grid span
              width: { xs: "100%", md: "100px" },
              "& .Mui-disabled": {
                WebkitTextFillColor: "black !important",
              },
            }}
          />

          {/* FOR scheme list */}
          <TextField
            label="Scheme"
            type="text"
            disabled
            value={scheme || "N/A"} // Show N/A if no scheme
            sx={{
              gridColumn: { xs: "span 1", sm: "span 2", md: "auto" }, // Adjust grid span
              width: { xs: "100%", md: "150px" },
              "& .MuiInputBase-root.Mui-disabled": {
                color: "black", // Text color
                fontWeight: "bold",
                // Ensure background is not red like Overdue field unless intended
                backgroundColor: "transparent",
              },
              "& .MuiInputLabel-root.Mui-disabled": {
                color: "black", // Label color
              },
              "& .Mui-disabled": {
                WebkitTextFillColor: "black !important",
              },
            }}
          />

          {/* FOR PRICE */}
          <TextField
            label="Price"
            type="number"
            disabled // Assuming base price from product data is disabled
            value={Number(selectedProduct?.SaleRate)?.toFixed(0) || 0} // Format price to 0 decimals for display
            InputProps={{
              inputProps: { style: { textAlign: "right" } },
            }}
            sx={{
              gridColumn: { xs: "span 1", sm: "span 1", md: "auto" }, // Adjust grid span
              width: { xs: "100%", md: "100px" },
              "& .Mui-disabled": {
                WebkitTextFillColor: "black !important",
              },
            }}
          />

          {/* FOR suggested PRICE */}
          <TextField
            label="Sug.price"
            type="number"
            value={suggestedPrice || ""} // Use '' for 0
            onChange={(e) => {
              const value = parseInt(e.target.value, 10);
              setSuggestedPrice(Math.max(0, value || 0)); // Set to 0 if NaN or negative
            }}
            InputProps={{
              inputProps: { style: { textAlign: "right" } },
            }}
            sx={{
              gridColumn: { xs: "span 1", sm: "span 1", md: "auto" }, // Adjust grid span
              width: { xs: "100%", md: "100px" },
            }}
            disabled={loading || initialDataLoading || !selectedProduct}
            inputProps={{ min: 0 }} // Ensure minimum is 0
            onFocus={(e) => e.target.select()}
          />

          {/* FOR DISCOUNT1 */}
          <TextField
            label="D1 (%)" // Added unit for clarity
            type="number"
            disabled={!(selectedCustomer?.acid === 1438)}
            value={discount1 || 0}
            inputProps={{ max: 12, min: 0 }}
            onFocus={(e) => e.target.select()}
            onChange={(e) => {
              const value = Number(e.target.value);
              if (value + discount2 <= 12) setDiscount1(value);
            }} // Ensure non-negative
            sx={{
              gridColumn: { xs: "span 1", sm: "span 1", md: "auto" }, // Adjust grid span
              width: { xs: "100%", md: "100px" },
              "& .Mui-disabled": {
                fontWeight: "bold",
                WebkitTextFillColor: "black !important",
              },
            }}
          />

          {/* FOR DISCOUNT2 */}
          <TextField
            label="D2 (%)" // Added unit for clarity
            type="number"
            value={discount2 || 0}
            inputProps={{ max: 12, min: 0 }}
            onFocus={(e) => e.target.select()}
            onChange={(e) => {
              const value = Number(e.target.value);
              if (value + discount1 <= 12) setDiscount2(value);
            }} // Ensure non-negative
            disabled={!(selectedCustomer?.acid === 1438)}
            sx={{
              gridColumn: { xs: "span 1", sm: "span 1", md: "auto" }, // Adjust grid span
              width: { xs: "100%", md: "100px" },
              "& .Mui-disabled": {
                fontWeight: "bold",
                WebkitTextFillColor: "black !important",
              },
            }}
          />

          {/* FOR AMOUNT (Calculated Item Amount) */}
          <TextField
            label="Amount"
            type="text" // Display as text because it's formatted currency
            disabled
            value={formatCurrency(calculatedAmount)} // Display the formatted numeric amount
            InputProps={{
              inputProps: { style: { textAlign: "right" } },
            }}
            sx={{
              gridColumn: { xs: "span 1", sm: "span 2", md: "auto" }, // Adjust grid span - might need more width
              width: { xs: "100%", md: "150px" },
              "& .Mui-disabled": {
                fontWeight: "bold",
                WebkitTextFillColor: "black !important",
              },
            }}
          />

          {/* FOR REMAKES (Product Specific Remakes) */}
          <TextField
            label="Remakes"
            type="text"
            value={productRemakes}
            onChange={(e) => setProductRemakes(e.target.value)} // Corrected typo
            sx={{
              gridColumn: { xs: "span 3", sm: "span 2", md: "auto" }, // Adjust grid span
              width: { xs: "100%", md: "200px" },
            }}
            disabled={loading || initialDataLoading || !selectedProduct}
          />

          {/* for STOCK - Conditional Rendering based on user type */}
          {(user?.userType?.toLowerCase() === "admin" ||
            user?.username?.toLowerCase() === "zain") && (
            <TextField
              label="Stock"
              type="number"
              disabled
              value={selectedProduct?.StockQty ?? 0}
              sx={{
                gridColumn: { xs: "span 1", sm: "span 1", md: "auto" }, // Adjust grid span
                width: { xs: "100%", md: "100px" },
                "& .MuiInputBase-root.Mui-disabled": {
                  backgroundColor: "#f0f0f0",
                  color: "black",
                  fontWeight: "bold",
                },
                "& .MuiInputLabel-root.Mui-disabled": {
                  color: "#888",
                },
                "& .Mui-disabled": {
                  fontWeight: "bold",
                  WebkitTextFillColor: "black !important",
                },
              }}
            />
          )}

          {/* Add Product Button */}
          <Button
            variant="contained"
            onClick={handleAddProduct}
            startIcon={<AddIcon />}
            disabled={
              loading ||
              initialDataLoading ||
              !selectedProduct ||
              orderQuantity < 1 ||
              !selectedCustomer // Requires selected customer, product, and quantity
            }
            sx={{
              height: "56px", // Match TextField height
              gridColumn: { xs: "1 / -1", sm: "span 1", md: "auto" }, // Full width on xs, auto on sm+
              alignSelf: "start", // Align to the top in grid cell
            }}
          >
            Add
          </Button>
        </Box>

        {/* ORDER LIST (Preview) */}
        {orderItems.length > 0 && (
          <Box sx={{ marginY: 2 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography variant="h6" gutterBottom>
                {" "}
                {/* Use h6 and gutterBottom for spacing */}
                Order Preview
              </Typography>
              <Button
                variant="contained"
                color="secondary"
                size="small"
                onClick={() => {
                  setOrderItems([]); // Clear order items
                }}
                disabled={loading}
                sx={{ mb: 1 }}
              >
                Clear Order
              </Button>
            </Box>
            <List
              dense
              sx={{
                maxHeight: 300,
                overflowY: "auto",
                border: "1px solid #eee",
                borderRadius: "4px",
              }}
            >
              {" "}
              {/* Added max height and border */}
              {orderItems.map((item, index) => (
                <ListItem
                  key={`${item.productID}-${index}`} // Use a key that uniquely identifies the item instance
                  divider
                  secondaryAction={
                    <IconButton
                      edge="end"
                      aria-label="delete"
                      onClick={() => handleRemoveProduct(index)}
                      disabled={loading}
                      size="small"
                    >
                      <CloseIcon sx={{ color: "red", fontWeight: "bold" }} />
                    </IconButton>
                  }
                  sx={{ py: 0.5 }}
                >
                  <ListItemText
                    primary={item.name}
                    secondary={`Qty: ${item.orderQuantity} (${
                      item.quantity
                    } TQ) | Rate: ${
                      Number(item.rate).toFixed(0) // Format rate for display
                    } | ${item.company} | ${item.model} | Amt: ${formatCurrency(
                      item.amount
                    )} | SchPc: ${item.schPc}
                    
                    `} // Include more details in secondary text
                    primaryTypographyProps={{
                      fontSize: { xs: ".9rem", sm: "1rem" }, // Adjust font size
                      fontWeight: "bold",
                      noWrap: true, // Prevent wrapping
                    }}
                    secondaryTypographyProps={{
                      fontSize: { xs: ".7rem", sm: ".8rem" }, // Adjust font size
                      color: "text.secondary",
                      noWrap: true, // Prevent wrapping
                    }}
                  />
                </ListItem>
              ))}
            </List>

            {/* Order Total Amount Display */}
            <Box sx={{ mt: 2, textAlign: "right" }}>
              <Typography variant="h6">
                {" "}
                {/* Use variant h6 */}
                <b>Total Items:</b> {orderItems.length}
              </Typography>
              <Typography variant="h5">
                {" "}
                {/* Use variant h5 for total */}
                <b>Total Amount: </b> {doc ? formatCurrency(totalAmount + perAmount): totalAmount}{" "}
                {/* Display formatted total */}
              </Typography>
            </Box>
          </Box>
        )}

        {/* Post Order Button */}
        <Box sx={{ mt: 3, textAlign: "center" }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={handlePostOrder}
            disabled={
              loading || // Disable during loading/posting
              initialDataLoading || // Disable during initial data fetch
              orderItems.length === 0 || // Cannot post empty order
              !selectedCustomer // Must have a selected customer
            }
            sx={{ minWidth: "200px" }}
          >
            {loading ? ( // Show loader when 'loading' state is true (specifically for post order)
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Post Order"
            )}
          </Button>
        </Box>
        {/* print Order Button */}
        <Box sx={{ mt: 3, textAlign: "center" }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={handlePrint}
            disabled={
              loading || // Disable during loading/posting
              initialDataLoading || // Disable during initial data fetch
              orderItems.length === 0 || // Cannot post empty order
              !selectedCustomer // Must have a selected customer
            }
            sx={{ minWidth: "200px" }}
          >
            {orderItems && // Show loader when 'loading' state is true (specifically for post order)
              "Print"}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

// --- Move this code to a new file: OrderPage.jsx ---
export function OrderPage({ customerAcid }) {
  const [nextDoc, setNextDoc] = useState("");

  useEffect(() => {
    if (customerAcid) {
      axios
        .get(`/api/orders/nextdoc?acid=${customerAcid}`)
        .then((res) => setNextDoc(res.data.nextDoc))
        .catch(() => setNextDoc(""));
    } else {
      setNextDoc("");
    }
  }, [customerAcid]);
}

export default OrderForm;
