import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  server:{
    allowedHosts: [
      'thin-signs-marry.loca.lt',  // <-- add your tunnel hostname here
      // You can also allow all hosts with: 'all'
    ]
    ,
    host: "0.0.0.0",
    port: 5173,
  },
  preview: {
    port: 5173,
  },
  plugins: [
    react(),

VitePWA({
  registerType: 'autoUpdate',
  strategies: 'injectManifest',
  srcDir: 'src',
  filename: 'sw.js',
   devOptions: {
        enabled: true, // to enable SW in dev mode
      },
  manifest: {
    name: 'Your App',
    short_name: 'sms',
    start_url: '/',
    display: 'standalone',
    icons: [
      {
        src: '/icons/cash.png',
        sizes: '192x192',
        type: 'image/png'
      },
      {
        src: '/icons/cash.png',
        sizes: '512x512',
        type: 'image/png'
      }
    ]
  }
})

  ],
});
