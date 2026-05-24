import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { queryClient } from './api/queryClient';
import { AuthContext } from './lib/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import ImagesDashboard from './pages/ImagesDashboard';
import VideosDashboard from './pages/VideosDashboard';
import GenerateVideo from './pages/GenerateVideo';
import VideoGallery from './pages/VideoGallery';
import BuyCredits from './pages/BuyCredits';
import EditImage from './pages/EditImage';
import ForgotPassword from './pages/ForgotPassword';
import VerifyEmail from './pages/VerifyEmail';
import SettingsPage from './pages/SettingsPage';
import AdminPanel from './pages/AdminPanel';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';

function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token') || new URLSearchParams(window.location.search).get('token');
    if (token) {
      localStorage.setItem('token', token);
      try {
        const res = await fetch('/wp/lefimovart/api/auth/me.php', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      } catch (e) {
        localStorage.removeItem('token');
      }
    }
    setIsLoading(false);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen bg-background"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div></div>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={{ user, setUser, logout }}>
        <Router basename="/wp/lefimovart/">
          <Routes>
            {!user ? (
              <>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/verify" element={<VerifyEmail />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
              </>
            ) : (
              <>
                <Route path="/" element={<Home />} />
                <Route path="/ai-images" element={<ImagesDashboard />} />
                <Route path="/ai-videos" element={<VideosDashboard />} />
                <Route path="/gallery" element={<Navigate to="/ai-images?tab=gallery" replace />} />
                <Route path="/edit" element={<EditImage />} />
                <Route path="/generate-video" element={<GenerateVideo />} />
                <Route path="/videos" element={<VideoGallery />} />
                <Route path="/buy-credits" element={<BuyCredits />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/admin" element={<AdminPanel />} />
                <Route path="/AdminPanel" element={<AdminPanel />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </>
            )}
          </Routes>
        </Router>
        <Toaster />
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

export default App;
