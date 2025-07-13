import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import axios from 'axios';

// Import Components
import NavBar from './components/NavBar';
import LandingPage from './components/LandingPage';
import ProductList from './components/ProductList';
import Login from './components/Login';
import Register from './components/Register';
import AddProducts from './components/AddProducts';
import Settings from './components/Settings';
import Checkout from './components/Checkout';
import PaymentSuccess from './components/PaymentSuccess';
import PaymentCancel from './components/PaymentCancel';
import OrderHistory from './components/OrderHistory';
import ForgotPassword from './components/ForgotPassword';
import LinkMinecraft from './components/LinkMinecraft';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import Footer from './components/Footer';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';
import Wiki from './components/Wiki';
import AdminWiki from './components/AdminWiki';
import LiveChat from './components/LiveChat'; // Import LiveChat
import AdminChat from './components/AdminChat'; // Import AdminChat

import './css/App.css';

function App() {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [cart, setCart] = useState([]);
  const [settings, setSettings] = useState(null);
  const [exchangeRates, setExchangeRates] = useState(null);
  const [loading, setLoading] = useState(true);

  // Memoize handleLogout to ensure it's a stable dependency for useEffect.
  const handleLogout = useCallback(() => {
    setUser(null);
    setIsAuthenticated(false);
    setIsAdmin(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setCart([]);
  }, []);

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const [settingsResponse, ratesResponse] = await Promise.all([
          axios.get('http://localhost:5000/api/v1/settings'),
          axios.get('https://open.er-api.com/v6/latest/USD')
        ]);

        if (settingsResponse.data) {
          setSettings(settingsResponse.data);
        }
        if (ratesResponse.data && ratesResponse.data.rates) {
          setExchangeRates(ratesResponse.data.rates);
        }

      } catch (error) {
        console.error("Could not fetch initial data", error);
        // Use functional update to avoid dependency on settings state
        setSettings(s => s || { store_name: 'AtlasCore', currency: 'USD' });
      } finally {
        setLoading(false);
      }
    };

    const loadUserFromStorage = () => {
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        if (token && storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            setIsAuthenticated(true);
            setIsAdmin(parsedUser.isAdmin === 1 || parsedUser.isAdmin === true);
          } catch (e) {
            handleLogout();
          }
        }
    };

    loadUserFromStorage();
    fetchInitialData();
  }, [handleLogout]);

  const handleLogin = (userData = {}) => {
    const { user: loggedInUser, token } = userData;
    if (loggedInUser && token) {
      setUser(loggedInUser);
      setIsAuthenticated(true);
      setIsAdmin(loggedInUser.isAdmin === 1 || loggedInUser.isAdmin === true);
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(loggedInUser));
    }
  };

  const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const updateSettings = (newSettings) => {
    setSettings(newSettings);
  };

  if (loading) {
      return <div className="loading-container">Loading...</div>;
  }

  return (
    <Router>
      <div className="App">
        <NavBar user={user} isAuthenticated={isAuthenticated} isAdmin={isAdmin} logout={handleLogout} settings={settings} />
        <main className="content">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            
            <Route 
              path="/shop" 
              element={<ProductList 
                user={user} 
                cart={cart} 
                setCart={setCart} 
                settings={settings} 
                isAdmin={isAdmin} 
                exchangeRates={exchangeRates} 
              />} 
            />
            
            <Route path="/login" element={<Login onLoginSuccess={handleLogin} />} />
            <Route path="/register" element={<Register onLoginSuccess={handleLogin} />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            
            {/* Updated Wiki Routes */}
            <Route path="/wiki" element={<Wiki user={user} />}>
              <Route path=":type/:id" element={<Wiki user={user} />} />
            </Route>
            
            {isAuthenticated && (
              <>
                <Route path="/dashboard" element={<Dashboard user={user} onUserUpdate={handleUserUpdate} />} />
                <Route path="/settings" element={<Settings user={user} onSettingsUpdate={updateSettings} />} />
                <Route path="/checkout" element={<Checkout cart={cart} user={user} settings={settings} exchangeRates={exchangeRates} />} />
                <Route path="/payment/success" element={<PaymentSuccess />} />
                <Route path="/payment/cancel" element={<PaymentCancel />} />
                <Route path="/order-history" element={<OrderHistory user={user} />} />
                <Route path="/link-minecraft" element={<LinkMinecraft user={user} onLoginSuccess={handleLogin} />} />
              </>
            )}

            {isAdmin && (
              <>
                <Route path="/admin" element={<AddProducts />} />
                <Route path="/admin-dashboard" element={<AdminDashboard user={user} />} />
                <Route path="/admin/wiki" element={<AdminWiki />} />
                <Route path="/admin/chat" element={<AdminChat />} />
              </>
            )}

            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />

          </Routes>
        </main>
        <Footer storeName={settings?.store_name} />
        <LiveChat user={user} isAdmin={isAdmin} />
      </div>
    </Router>
  );
}

export default App;
