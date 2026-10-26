import React, { useState } from 'react';
import { useAuth } from './services/AuthContext';
import { AuthModal } from './components/AuthModal';
import { HomePage } from './pages/HomePage';
import { CanvasRoomPage } from './pages/CanvasRoomPage';

export function App() {
  const { user, isAuthenticated, loading } = useAuth();
  const [activeRoom, setActiveRoom] = useState(null);

  if (loading) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-main)',
          fontSize: '16px',
          fontWeight: '700',
          color: 'var(--text-secondary)'
        }}
      >
        Loading CoCanvas.io...
      </div>
    );
  }

  // If not logged in, prompt Auth Modal with Sign In / Account Creation
  if (!isAuthenticated || !user) {
    return <AuthModal />;
  }

  // If inside an active canvas room
  if (activeRoom) {
    return (
      <CanvasRoomPage
        room={activeRoom}
        onLeaveRoom={() => setActiveRoom(null)}
      />
    );
  }

  // Home screen
  return (
    <HomePage
      onEnterRoom={(room) => setActiveRoom(room)}
    />
  );
}
export default App;
