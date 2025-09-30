import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import AddTransaction from './components/AddTransaction';
import Reports from './components/Reports';

import Navigation from './components/Navigation';

function App() {
  const [currentView, setCurrentView] = useState('login');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      setCurrentView('dashboard');
    }
  }, [token]);

  const handleLogin = (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', userToken);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setCurrentView('login');
  };

  const renderCurrentView = () => {
    if (!user) {
      switch (currentView) {
        case 'register':
          return <Register onLogin={handleLogin} onSwitchToLogin={() => setCurrentView('login')} />;
        default:
          return <Login onLogin={handleLogin} onSwitchToRegister={() => setCurrentView('register')} />;
      }
    }

    switch (currentView) {
      case 'add-transaction':
        return <AddTransaction onBack={() => setCurrentView('dashboard')} />;
      case 'reports':
        return <Reports />;


      default:
        return <Dashboard onAddTransaction={() => setCurrentView('add-transaction')} />;
    }
  };

  return (
    <div className="app">
      {user && (
        <Navigation
          user={user}
          currentView={currentView}
          onNavigate={setCurrentView}
          onLogout={handleLogout}
        />
      )}
      {renderCurrentView()}
    </div>
  );
}

export default App;