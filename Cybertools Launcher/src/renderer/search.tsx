import React from 'react';
import ReactDOM from 'react-dom/client';
import SearchApp from './SearchApp';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('search-root')!).render(
  <React.StrictMode>
    <SearchApp />
  </React.StrictMode>
);
