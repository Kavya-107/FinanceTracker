import React from 'react';

const Navigation = ({ user, currentView, onNavigate, onLogout }) => {
  return (
    <nav className="navigation">
      <div className="nav-brand">FinMate</div>
      
      <div className="nav-menu">
        <div 
          className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
          onClick={() => onNavigate('dashboard')}
        >
          Dashboard
        </div>
        <div 
          className={`nav-item ${currentView === 'add-transaction' ? 'active' : ''}`}
          onClick={() => onNavigate('add-transaction')}
        >
          Add Transaction
        </div>
        
        <div 
          className={`nav-item ${currentView === 'reports' ? 'active' : ''}`}
          onClick={() => onNavigate('reports')}
        >
          Reports
        </div>
      </div>

      <div className="user-info">
        <span>Welcome, {user.name}</span>
        <button className="logout-btn" onClick={onLogout}>
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navigation;