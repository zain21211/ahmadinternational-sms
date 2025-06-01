import React, { useState, useEffect } from "react";
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Button,
  Avatar,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Menu,
  MenuItem,
} from "@mui/material";
import {
  Menu as MenuIcon,
  AccountCircle,
  Settings as SettingsIcon,
  ExitToApp as ExitToAppIcon,
  ReceiptSharp as ReceiptSharpIcon,
  BookSharp as BookSharpIcon,
} from "@mui/icons-material";

import { useNavigate, useLocation } from "react-router-dom"; // Import useLocation

// Define menu item components and their icons
const profileMenuItems = [
  {
    label: "Username",
    icon: AccountCircle,
  },
  {
    label: "Role",
    icon: SettingsIcon,
  },
  {
    label: "Logout",
    icon: ExitToAppIcon,
  },
];
const drawerMenuItems = [
  {
    label: "Order",
    icon: ReceiptSharpIcon,
    path: "/order",
  },
  {
    label: "Ledger",
    icon: BookSharpIcon,
    path: "/ledger",
  },
  {
    label: "Recovery",
    icon: BookSharpIcon,
    path: "/recovery",
  },
];

// This URL seems to be where your app is served FROM for login, or an external logout target
// If it's the root of your React app (where the login page is), use "/" for navigate
const LOGOUT_REDIRECT_URL = "http://100.72.169.90:5173/"; // Forcing external navigation
// If your login page is at the root of THIS React app, use:
const LOGIN_APP_PATH = "/";

const Header = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentUser, setCurrentUser] = useState(null); // State for user
  const isMenuOpen = Boolean(anchorEl);
  const navigate = useNavigate();
  const location = useLocation(); // Get location object

  // Effect to update currentUser when localStorage changes or location changes
  useEffect(() => {
    const updateUserState = () => {
      try {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          setCurrentUser(JSON.parse(storedUser));
        } else {
          setCurrentUser(null);
        }
      } catch (error) {
        console.error("Failed to parse user from localStorage:", error);
        localStorage.removeItem("user"); // Clear corrupted item
        setCurrentUser(null);
      }
    };

    updateUserState(); // Initial check

    // Optional: Listen for storage events if changes can happen in other tabs
    // window.addEventListener('storage', updateUserState);

    // return () => {
    //   window.removeEventListener('storage', updateUserState);
    // };
  }, [location.pathname]); // Re-run when path changes (e.g., after login navigation)

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    setCurrentUser(null); // Update state immediately
    handleProfileMenuClose(); // Close the menu

    // For navigating to a different origin or a page outside React Router's control
    window.location.href = LOGOUT_REDIRECT_URL;
    // If LOGOUT_REDIRECT_URL is actually the login page of THIS app (e.g., "/"), use:
    // navigate(LOGIN_APP_PATH);
  };

  useEffect(() => {
    const link = document.createElement("link");
    link.href =
      "https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);

    return () => {
      document.head.removeChild(link);
    };
  }, []);

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleProfileMenuClick = (item) => {
    // This function is mostly for non-logout items now
    console.log(`Clicked: ${item.label}`);
    handleProfileMenuClose();
  };

  const renderProfileMenu = (
    <Menu
      anchorEl={anchorEl}
      anchorOrigin={{
        vertical: "top",
        horizontal: "right",
      }}
      keepMounted
      transformOrigin={{
        vertical: "top",
        horizontal: "right",
      }}
      open={isMenuOpen}
      onClose={handleProfileMenuClose}
    >
      {profileMenuItems.map((item) => (
        <MenuItem
          key={item.label}
          onClick={() => {
            if (item.label.toLowerCase() === "logout") {
              handleLogout();
            } else {
              handleProfileMenuClick(item); // Handles closing the menu
            }
          }}
        >
          <ListItemIcon>
            <item.icon fontSize="small" />
          </ListItemIcon>
          <Typography variant="inherit">
            <b>{item.label}</b>
            {item.label === "Username" && currentUser?.username && `: ${currentUser.username}`}
            {item.label === "Role" && currentUser?.userType && `: ${currentUser.userType}`}
          </Typography>
        </MenuItem>
      ))}
    </Menu>
  );

  const handleDrawerMenuClick = (item) => {
    setDrawerOpen(false);
    navigate(item.path);
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar
        position="fixed"
        sx={{
          backgroundColor: "white",
          color: "black",
          boxShadow:
            "2px -2px 4px rgba(0, 0, 0, 0.1), 2px 2px 4px rgba(0, 0, 0, 0.1)",
        }}
      >
        <Toolbar
        sx={{
          m:0,
          minHeight:"48px"
        }}
        >
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: 2 }}
            onClick={handleDrawerToggle}
          >
            <MenuIcon />
          </IconButton>
          <Typography
            variant="h5"
            component="div"
            sx={{ flexGrow: 1, color: "#2d3436", fontFamily: "Montserrat" }}
          >
            AHMAD INTERNATIONAL
          </Typography>
          {!currentUser && (
            <Button color="inherit" onClick={() => navigate(LOGIN_APP_PATH)}> {/* Changed to LOGIN_APP_PATH */}
              Login
            </Button>
          )}
          {currentUser && (
            <IconButton
              size="large"
              edge="end"
              aria-label="account of current user"
              aria-controls={isMenuOpen ? 'profile-menu-appbar' : undefined}
              aria-haspopup="true"
              onClick={handleProfileMenuOpen}
              color="inherit"
            >
              <Avatar alt={currentUser?.username || 'User'} src="">
                {currentUser?.username ? currentUser.username.charAt(0).toUpperCase() : <AccountCircle />}
              </Avatar>
            </IconButton>
          )}
        </Toolbar>
      </AppBar>
      {currentUser && renderProfileMenu /* Only render if user is logged in */}
      <Drawer
        open={drawerOpen}
        onClose={handleDrawerToggle}
        sx={{
          opacity: 1,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: { xl: "30%", xs: "50%" },
            boxSizing: "border-box",
            bgcolor: "white",
          },
        }}
      >
        <Box
          role="presentation"
        >
          <List sx={{ bgcolor: "white", opacity: 1, pt: 2 /* Added some padding top */ }}>
            {drawerMenuItems.map((item) => (
              <ListItem
                // button // Replaced by ListItemButton for better accessibility and ripple
                component="button" // Or use ListItemButton from MUI
                key={item.label}
                onClick={() => handleDrawerMenuClick(item)}
                sx={{
                  mb: 2,
                  cursor: "pointer",
                  position: "relative",
                  textAlign: 'left', // Ensure text aligns left if component="button" used
                  width: '100%',   // Ensure button takes full width
                  border: 'none',  // Remove default button border
                  background: 'none', // Remove default button background
                  paddingLeft: (theme) => theme.spacing(2), // Match default ListItem padding
                  paddingRight: (theme) => theme.spacing(2),
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    left: "5%",
                    bottom: 0,
                    width: "90%",
                    height: "2px",
                    backgroundColor: "black",
                    transform: "scaleX(0)",
                    transformOrigin: "center",
                    transition: "transform 0.3s ease-in-out",
                  },
                  "&:hover": {
                    backgroundColor: "transparent",
                    "&::before": {
                      transform: "scaleX(1)",
                    },
                  },
                }}
              >
                <ListItemIcon>
                  <item.icon sx={{ fontSize: {xs: "1.8rem", xl: "2.5rem"} }} />
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    sx: {
                      color: "#2d3436",
                      fontSize: { xs: "1.2rem", xl: "1.8rem" },
                      fontWeight: "bold",
                      fontFamily: "Montserrat",
                    },
                  }}
                />
              </ListItem>
            ))}
          </List>
          <Divider />
        </Box>
      </Drawer>
      <Toolbar /> {/* Offset for fixed AppBar */}
    </Box>
  );
};

export default Header;