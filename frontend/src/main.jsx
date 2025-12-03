// Suppress WebSocket connection errors globally - MUST BE FIRST, BEFORE ANY IMPORTS
if (typeof window !== 'undefined') {
  // Store original console methods immediately
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalLog = console.log;
  
  // Helper to extract message from any argument type
  const extractMessage = (arg) => {
    if (typeof arg === 'string') return arg;
    if (arg?.message) return arg.message;
    if (arg?.toString) return arg.toString();
    if (arg?.stack) return arg.stack;
    return String(arg);
  };
  
  // Override console.error to suppress WebSocket errors
  console.error = (...args) => {
    // Check all arguments for WebSocket-related messages
    const fullMessage = args.map(extractMessage).join(' ');
    
    // Check individual arguments for socket.io patterns
    const hasSocketPattern = args.some(arg => {
      const str = String(arg);
      return str.includes('socket__io-client') || 
             str.includes('socket.io-client') ||
             str.includes('socket.io') ||
             str.includes('ws://localhost:5000') ||
             str.includes('doClose') ||
             str.includes('@ socket__io-client');
    });
    
    // Suppress ALL WebSocket connection errors (comprehensive check)
    // Check for error messages, stack traces, and file names
    if (fullMessage.includes('WebSocket') || 
        fullMessage.includes('socket.io') ||
        fullMessage.includes('socket__io-client') ||
        fullMessage.includes('socket.io-client') ||
        fullMessage.includes('ws://localhost:5000') ||
        fullMessage.includes('ws://') ||
        fullMessage.includes('wss://') ||
        (fullMessage.includes('failed') && (fullMessage.includes('connection') || fullMessage.includes('WebSocket'))) ||
        fullMessage.includes('closed before') ||
        fullMessage.includes('closed without') ||
        fullMessage.includes('doClose') ||
        fullMessage.includes('_onClose') ||
        fullMessage.includes('_close') ||
        fullMessage.includes('_destroy') ||
        fullMessage.includes('close @') ||
        fullMessage.includes('destroy @') ||
        fullMessage.includes('socket__io-client.js') ||
        fullMessage.includes('@ socket__io-client') ||
        hasSocketPattern) {
      return; // Suppress these errors completely
    }
    originalError.apply(console, args);
  };
  
  // Also override console.warn for socket.io warnings
  console.warn = (...args) => {
    const fullMessage = args.map(extractMessage).join(' ');
    
    // Suppress WebSocket warnings
    if (fullMessage.includes('WebSocket') || 
        fullMessage.includes('socket.io') ||
        fullMessage.includes('socket__io-client') ||
        fullMessage.includes('socket.io-client') ||
        fullMessage.includes('ws://') ||
        fullMessage.includes('wss://')) {
      return; // Suppress these warnings
    }
    originalWarn.apply(console, args);
  };
  
  // Override console.log for socket.io debug messages
  console.log = (...args) => {
    const fullMessage = args.map(extractMessage).join(' ');
    
    // Suppress socket.io debug logs
    if (fullMessage.includes('socket.io') && 
        (fullMessage.includes('failed') || fullMessage.includes('error') || fullMessage.includes('WebSocket'))) {
      return; // Suppress these logs
    }
    originalLog.apply(console, args);
  };
  
  // Catch unhandled errors at window level (capture phase - earliest possible)
  const errorHandler = (event) => {
    const message = event.message || event.error?.message || '';
    const source = event.filename || '';
    const stack = event.error?.stack || '';
    
    // Check if it's a WebSocket/socket.io error
    const isSocketError = (message.includes('WebSocket') || 
         message.includes('socket.io') ||
         message.includes('socket__io-client') ||
         message.includes('socket.io-client') ||
         source.includes('socket__io-client') ||
         source.includes('socket.io-client') ||
         source.includes('socket.io') ||
         stack.includes('socket__io-client') ||
         stack.includes('socket.io-client') ||
         stack.includes('socket.io') ||
         source.includes('socket__io-client.js') ||
         message.includes('@ socket__io-client') ||
         stack.includes('@ socket__io-client') ||
         message.includes('doClose'));
    
    if (isSocketError && (
      message.includes('failed') || 
      message.includes('closed') ||
      message.includes('doClose') ||
      message.includes('_onClose') ||
      message.includes('_close') ||
      message.includes('_destroy') ||
      message.includes('close @') ||
      message.includes('destroy @') ||
      message.includes('@ socket__io-client') ||
      stack.includes('doClose') ||
      stack.includes('socket__io-client') ||
      !message // If message is empty but source/stack indicates socket.io, suppress it
    )) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      return false;
    }
  };
  
  window.addEventListener('error', errorHandler, true);
  
  // Catch unhandled promise rejections
  const rejectionHandler = (event) => {
    const message = event.reason?.message || 
                    event.reason?.toString() || 
                    String(event.reason) || '';
    const stack = event.reason?.stack || '';
    
    if (message.includes('WebSocket') || 
        message.includes('socket.io') ||
        message.includes('socket__io-client') ||
        message.includes('socket.io-client') ||
        stack.includes('socket__io-client') ||
        stack.includes('socket.io-client') ||
        message.includes('ws://') ||
        message.includes('wss://')) {
      event.preventDefault();
      event.stopPropagation();
      return false;
    }
  };
  
  window.addEventListener('unhandledrejection', rejectionHandler, true);
}

import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { initDB } from './utils/db';
import App from './App';
import './index.css';

// Initialize IndexedDB
if (typeof window !== 'undefined' && 'indexedDB' in window) {
  initDB()
    .catch(() => {});
}

// Register service worker for PWA
if ("serviceWorker" in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register("/sw.js")
      .then((reg) => {
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          newWorker.addEventListener('statechange', () => {
            // Service worker update available
          });
        });
      })
      .catch(() => {});
  });
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
