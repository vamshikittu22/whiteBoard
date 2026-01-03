import React from 'react';
import { createRoot } from 'react-dom/client';
import './register-konva'; // Register shapes first
import App from './App';

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);