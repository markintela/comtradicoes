import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import settings from './settings.js';
import './styles.css';

document.documentElement.style.setProperty('--accent', settings.corPrincipal);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
