// index.js
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App'; 

// Get the root DOM element where the app will be rendered
const container = document.getElementById('root');
const root = createRoot(container);

// Render the App component wrapped in BrowserRouter
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
