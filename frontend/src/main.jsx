// src/main.jsx or wherever your main layout component is

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import { Box, useTheme, styled } from '@mui/material'; // Import styled if you want

import './App.css'; // Your base CSS
import App from './App.jsx';
import Ledger from './Ledger.jsx';
import Login from './LoginPage.jsx';
import EstimatePage from './EstimatePage.jsx';
import BillingComponent from './BillingComponent.jsx';
import OrderForm from './OrderForm.jsx';
import Header from "./Header.jsx";
import RecoveryPaper from "./RecoveryPaper.jsx";
import { registerSW } from 'virtual:pwa-register';


if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      console.log('SW registered:', reg);
    }).catch((err) => {
      console.error('SW registration failed:', err);
    });
  });
}



// Create a styled component or use sx for the spacer Box
const ToolbarSpacer = styled(Box)(({ theme }) => theme.mixins.toolbar);

const AppLayout = () => {
  const theme = useTheme(); // (Still need useTheme if using styled/sx)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 'auto' }}>
      <Header/> {/* Your fixed header component */}
      <Box
        component="main"
      >
        <Routes>
          {/* Your routes */}
           <Route path="/" element={<Login />} />
           <Route path="/login" element={<Login />} />
           <Route path="/ledger" element={<Ledger />} />
           <Route path="/invoice/:id" element={<BillingComponent />} />
           <Route path="/order" element={<OrderForm />} />
           <Route path="/estimate" element={<EstimatePage />} />
           <Route path="/app" element={<App />} />
           <Route path="/recovery" element={<RecoveryPaper />} />
        </Routes>
      </Box>

      {/* Optional Footer */}
    </Box>
  );
};

createRoot(document.getElementById('root')).render(
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
);