import { useEffect, useState } from 'react';
import axios from 'axios'

export const useRealOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(true);

  const checkInternet = async () => {
    try {
      // Ping a reliable endpoint
       const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    await fetch("https://clients3.google.com/generate_204", {
      method: "GET",
      mode: "no-cors", // avoid CORS issues
      cache: "no-cache",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
      setIsOnline(true);
    } catch (error) {
      setIsOnline(false);
    }
  };

  useEffect(() => {
    checkInternet(); // initial check

    const handleOnline = () => checkInternet();
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Optionally check every few seconds in background
    const interval = setInterval(checkInternet, 10000); // every 10s

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  return isOnline;
};
