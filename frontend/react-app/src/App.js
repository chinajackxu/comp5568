import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import TokenManagement from './pages/TokenManagement';
import PoolSettings from './pages/PoolSettings';
import PositionManagement from './pages/PositionManagement';
import FeeManagement from './pages/FeeManagement';
import UserDashboard from './pages/UserDashboard';
import TokenSwap from './pages/TokenSwap';
import TransactionHistory from './pages/TransactionHistory';
import PriceChart from './pages/PriceChart';
import LiquidityManagement from './pages/LiquidityManagement';
import UserPage from './pages/UserPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/tokens" element={<TokenManagement />} />
        <Route path="/admin/pool-settings" element={<PoolSettings />} />
        <Route path="/admin/positions" element={<PositionManagement />} />
        <Route path="/admin/fees" element={<FeeManagement />} />
        <Route path="/user" element={<UserDashboard />} />
        <Route path="/user/swap" element={<TokenSwap />} />
        <Route path="/user/history" element={<TransactionHistory />} />
        <Route path="/user/price" element={<PriceChart />} />
        <Route path="/user/liquidity" element={<LiquidityManagement />} />
        <Route path="/user/page" element={<UserPage />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
