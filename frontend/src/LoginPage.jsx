// src/pages/Login.jsx or src/components/Login.jsx
import React, { useState, useEffect } from "react";
import axios from "axios"; // Ensure you have axios installed
import { useNavigate, Link as RouterLink } from "react-router-dom"; // Renamed Link to RouterLink to avoid conflict with MUI Link

// Material UI Components
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  Paper,
  CircularProgress,
  Alert,
  Link as MuiLink, // MUI Link
  IconButton,
  InputAdornment,
  FormControl,
  InputLabel,
  OutlinedInput,
} from "@mui/material";

// Material UI Icons
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import { jwtDecode } from "jwt-decode";

const Login = () => {
  const [name, setName] = useState(""); // Assuming 'name' is username or similar identifier
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const [decoded, setDecoded] = useState({});
  const token = localStorage.getItem("authToken");
  const navigate = useNavigate();
  const[checked, setChecked] = useState(true);

  function isTokenExpired(token) {
    try {
      const decoded = jwtDecode(token);
      if (!decoded.exp) return false;
      return decoded.exp < Date.now() / 1000;
    } catch (e) {
      return true; // Invalid token
    }
  }
  // Check for existing token on component mount
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    
    if (token && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUserData(parsedUser);
        setIsLoggedIn(true);

      } catch (e) {
        console.error("Failed to parse user data from localStorage", e);
        // Clear potentially corrupted data
        localStorage.removeItem("authToken");
        localStorage.removeItem("user");
        setIsLoggedIn(false);
      }
    } else {
      setIsLoggedIn(false);
    }
  }, []);

const handleChange = (event) => {
    setChecked(event.target.checked);
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // --- Actual API Call ---
      const response = await axios.post(
        "http://100.122.80.93:3001/api/login", // Replace with your actual API endpoint
        {
          password: password,
          checked: checked
        }
      );

      const token = response.data.token;
      console.log("expires in: ", response.data.options)
      const decode = jwtDecode(token); // Get id, username, userType, etc.

      const userFromApi = decode; // Assuming this is the user object

      localStorage.setItem("authToken", token);
      localStorage.setItem("user", JSON.stringify(userFromApi));

      setUserData(userFromApi);
      setIsLoggedIn(true);
    } catch (err) {
      let errorMessage = "An unexpected error occurred. Please try again.";
      if (axios.isAxiosError(err) && err.response) {
        // Handle specific API error messages if available
        errorMessage =
          err.response.data.message || err.response.data.error || errorMessage;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      console.error("Login failed:", err);
      setError(errorMessage);
      setPassword(""); // Clear password field on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    setIsLoggedIn(false);
    setUserData(null);
    setName(""); // Clear form fields
    setPassword("");
  };

  // Conditional Rendering: Show links if logged in, show form otherwise
  if (isLoggedIn && token && !isTokenExpired(token)) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height:"100%",
          alignContent:"center",
          flexWrap: 'wrap', // Align the login window to the top
          bgcolor: "grey.100", // Light mode background
          padding: 2, // Add some padding on smaller screens
        }}
      >
        <Paper
          elevation={6} // Shadow
          sx={{
            width: "100%",
            maxWidth: 400, // max-w-md equivalent
            padding: 4, // p-8 equivalent (MUI spacing unit, 4 * 8px = 32px)
            borderRadius: "35px", // rounded-xl equivalent
            border: "1px solid",
            borderColor: "grey.300", // dark:border-gray-700 would need theme
            textAlign: "center",
          }}
        >
          <Typography variant="h5" component="h2" gutterBottom>
            Welcome Back, {userData?.name || userData?.username || "User"}!
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            You are logged in.
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Button
              component={RouterLink} // Use RouterLink for navigation
              to="/recovery" // Replace with your actual order page route
              variant="contained"
              size="large"
              sx={{ py: 1.5, height: "60px", bgcolor: "green" }} // Add vertical padding
            >
              Recovery
            </Button>
            <Button
              component={RouterLink} // Use RouterLink for navigation
              to="/order" // Replace with your actual order page route
              variant="contained"
              size="large"
              sx={{ py: 1.5, height: "60px" }} // Add vertical padding
            >
              Create New Order
            </Button>
            <Button
              component={RouterLink} // Use RouterLink for navigation
              to="/ledger" // Replace with your actual ledger page route
              variant="contained"
              color="secondary" // Use a different color for distinction
              size="large"
              sx={{ py: 1.5, height: "60px" }} // Add vertical padding
            >
              View Ledger & Invoices
            </Button>
          </Box>
          <Button
            onClick={handleLogout}
            variant="outlined" // Outline style
            color="inherit" // Inherit text color
            sx={{
              mt: 10,
              width: "100%",
              height: "60px",
              bgcolor: "RED",
              color: "WHITE", // Text color for the button
              fontWeight: "bold", // Bold text
              "&:hover": {
                bgcolor: "WHITE", // Keep the same color on hover
                color: "BLACK", 
              }// Keep the same text color on hover
            }} // top margin and full width
          >
            Logout
          </Button>
        </Paper>
      </Box>
    );
  }

  // If not logged in, show the login form (MUI version)
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "grey.100", // Light mode background
        // Add dark mode if using MUI Theme Provider
        // '&.MuiBox-root': (theme) => ({
        //   bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100',
        // }),
        padding: 2, // Add some padding on smaller screens
      }}
    >
      <Paper
        elevation={6} // shadow-xl equivalent
        sx={{
          width: "100%",
          maxWidth: 400, // max-w-md equivalent (using pixels)
          padding: 4, // p-8 equivalent (MUI spacing unit, 4 * 8px = 32px)
          borderRadius: 2, // rounded-xl equivalent (MUI border radius unit, 2 * 4px = 8px)
          border: "1px solid",
          borderColor: "grey.300", // dark:border-gray-700 would need theme
        }}
      >
        <Box sx={{ textAlign: "center", mb: 4 }}>
          {" "}
          {/* mb-8 equivalent */}
          {/* Optional: Add a logo here */}
          {/* <Box component="img" src="/logo.svg" alt="Logo" sx={{ mx: 'auto', height: 60, mb: 2 }} /> */}
          <Typography
            variant="h4"
            component="h1"
            fontWeight="bold"
            color="text.primary"
          >
            {" "}
            {/* text-3xl font-bold text-gray-800 */}
            Login.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {" "}
            {/* text-sm text-gray-600 */}
            Access your account.
          </Typography>
        </Box>

        <Box
          component="form"
          onSubmit={handleLogin}
          sx={{ display: "flex", flexDirection: "column", gap: 3 }}
        >
          {" "}
          {/* space-y-6 equivalent */}
          {/* Name/Username Field - Use TextField with startAdornment */}
          {/* Include only if your API uses it for login */}
          {/* Password Field - Custom structure for visibility toggle */}
          <div>
            {" "}
            {/* Or remove this div and use gap on parent Box */}
            <Typography
              variant="body2"
              component="label"
              htmlFor="password-input"
              color="text.secondary"
              sx={{ display: "block", mb: 0.5, fontWeight: "medium" }}
            >
              {" "}
              {/* label styling */}
              Password
            </Typography>
            <FormControl fullWidth variant="outlined">
              {/* InputLabel can be inside FormControl, but we're using custom Typography label above */}
              {/* So, we use OutlinedInput directly */}
              <OutlinedInput
                id="password-input" // Connects to Typography htmlFor
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
                // error={!!error} // Link to error state if needed for input styling
                // aria-describedby="password-error" // Connects to error message below
                size="medium" // Controls padding/height
                startAdornment={
                  <InputAdornment position="start">
                    <LockOutlinedIcon color="action" />{" "}
                    {/* gray-400 equivalent */}
                  </InputAdornment>
                }
                endAdornment={
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      disabled={isLoading}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                }
              />
              {/* Example of helperText if you want error message directly below the input */}
              {/* {error && <FormHelperText id="password-error" error>{error}</FormHelperText>} */}
            </FormControl>
          </div>
          {/* Forgot Password Link */}
          <Box sx={{ textAlign: "right", mt: -1.5 }}>
            {" "}
            {/* Negative margin to pull it closer to input */}
            <FormControlLabel
              control={<Checkbox checked={checked} onChange={handleChange} />}
              label="Remember Me"
            />
          </Box>
          {/* Error Message Alert */}
          {error && (
            <Alert
              severity="error"
              sx={{ mb: 2 }}
              aria-live="assertive"
              id="password-error"
              onClose={() => setError(null)}
            >
              {" "}
              {/* text-sm text-red-600 text-center */}
              {error}
            </Alert>
          )}
          {/* Submit Button */}
          <Button
            type="submit"
            fullWidth // w-full equivalent
            variant="contained"
            size="large" // Controls padding/height
            disabled={isLoading}
            sx={{
              py: 1.5, // Custom vertical padding
              mt: 2, // Top margin
              transition: "background-color 0.15s ease-in-out", // transition
              // Conditional background color based on loading state
              bgcolor: isLoading ? "indigo.300" : "primary.main", // Using placeholder colors, replace with theme colors
              "&:hover": {
                bgcolor: isLoading ? "indigo.300" : "primary.dark", // Placeholder hover
              },
              // Using color names directly or defining in theme for better control
              // Example using theme colors (requires custom theme setup with named colors like 'indigo'):
              // bgcolor: isLoading ? 'indigo[400]' : 'indigo[600]',
              // '&:hover': {
              //   bgcolor: isLoading ? 'indigo[400]' : 'indigo[700]',
              // },
              // '&:disabled': {
              //   bgcolor: 'indigo[400]', // Tailwind bg-indigo-400 for disabled
              //   color: 'rgba(255, 255, 255, 0.7)', // Disabled text color
              // }
            }}
          >
            {isLoading ? (
              <>
                <CircularProgress size={24} color="inherit" sx={{ mr: 1 }} />{" "}
                {/* Spinner with right margin */}
                Signing In...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </Box>

      </Paper>
    </Box>
  );
};

export default Login;
