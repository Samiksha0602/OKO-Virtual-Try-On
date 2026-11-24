import React, { useState } from 'react';
import Register from './components/Register';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

const App = () => {
  const [secretKey, setSecretKey] = useState(null);
  const [username, setUsername] = useState(null);
  const [showRegister, setShowRegister] = useState(false);

  if (!secretKey) {
    return showRegister ? (
      <Register
        onRegistered={() => setShowRegister(false)}
        onSwitchToLogin={() => setShowRegister(false)}
      />
    ) : (
      <Login
        onLogin={(key, user) => { setSecretKey(key); setUsername(user); }}
        onSwitchToRegister={() => setShowRegister(true)}
      />
    );
  }

  return (
    <Dashboard
      secretKey={secretKey}
      username={username}
      onLogout={() => { setSecretKey(null); setUsername(null); }}
    />
  );
};

export default App;
