import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './Layout';
import P1 from './P1';
import P2 from './P2';
import { Toaster } from 'react-hot-toast';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Toaster position="top-center" />
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<P1 />} />
          <Route path="/p2" element={<P2 />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);