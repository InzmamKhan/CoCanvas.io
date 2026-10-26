import React, { useState, useMemo } from 'react';
import { useAuth } from '../services/AuthContext';
import { CreateRoomModal } from '../components/CreateRoomModal';
import { JoinRoomModal } from '../components/JoinRoomModal';
import { Sparkles, PlusCircle, Users, LogOut, ShieldCheck, User } from 'lucide-react';

// Hardcoded Array of 10 size filled with strings as required
const GREETING_TEMPLATES = [
  'Welcome, {username}!',
  'What are we planning today, {username}?',
  'Let\'s sketch something brilliant, {username}.',
  'Ready to collaborate with your team, {username}?',
  'Your creative whiteboard is ready, {username}.',
  'Bring your big ideas to life, {username}.',
  'Let ideas flow freely today, {username}.',
  'Great to have you on board, {username}!',
  'Transform thoughts into diagrams, {username}.',
  'Ready to brainstorm together, {username}?'
];

export const HomePage = ({ onEnterRoom }) => {
  const { user, logout } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  // Pick one random greeting string from the hardcoded 10-item array
  const randomGreeting = useMemo(() => {
    const randomIndex = Math.floor(Math.random() * GREETING_TEMPLATES.length);
    const template = GREETING_TEMPLATES[randomIndex];
    return template.replace('{username}', user?.username || 'Creator');
  }, [user]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navbar */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 48px',
          background: 'var(--bg-main)',
          borderBottom: '1px solid rgba(209, 217, 230, 0.4)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '3px 3px 8px rgba(79, 70, 229, 0.3), -2px -2px 6px #ffffff'
            }}
          >
            <Sparkles size={22} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '-0.5px', color: '#1e293b' }}>
              CoCanvas<span style={{ color: '#4f46e5' }}>.io</span>
            </h1>
            <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>REALTIME WHITEBOARD</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            className="neu-card-sm"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 16px',
              borderRadius: '100px'
            }}
          >
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                background: '#e0e7ff',
                color: '#4f46e5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700',
                fontSize: '13px'
              }}
            >
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>{user?.username}</div>
              <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>{user?.userid}</div>
            </div>
          </div>

          <button
            onClick={logout}
            className="neu-button"
            title="Log Out"
            style={{ width: '42px', height: '42px', padding: 0, borderRadius: '50%' }}
          >
            <LogOut size={18} color="#64748b" />
          </button>
        </div>
      </header>

      {/* Main Hero Section */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 24px',
          maxWidth: '900px',
          margin: '0 auto',
          textAlign: 'center'
        }}
      >
        {/* Big Random Header from 10-size Array */}
        <div style={{ marginBottom: '16px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 16px',
              borderRadius: '100px',
              background: '#e0e7ff',
              color: '#4f46e5',
              fontSize: '12px',
              fontWeight: '700',
              marginBottom: '20px'
            }}
          >
            <ShieldCheck size={14} /> Up to 5 Live Collaborators per Room
          </div>
          <h1
            style={{
              fontSize: '44px',
              fontWeight: '800',
              color: '#0f172a',
              letterSpacing: '-1.2px',
              lineHeight: 1.2,
              marginBottom: '16px'
            }}
          >
            {randomGreeting}
          </h1>
          <p
            style={{
              fontSize: '17px',
              color: '#64748b',
              maxWidth: '580px',
              margin: '0 auto 48px',
              lineHeight: 1.6
            }}
          >
            Instant, zero-latency canvas sketchpad powered by WebSockets. Create a secure private or public room
            and invite your peers to sketch together.
          </p>
        </div>

        {/* 2 Big Options: 1. Create Room, 2. Join Room */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '28px',
            width: '100%',
            maxWidth: '680px'
          }}
        >
          {/* Option 1: Create Room */}
          <div
            onClick={() => setShowCreateModal(true)}
            className="neu-card"
            style={{
              padding: '36px 28px',
              cursor: 'pointer',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '20px',
                  boxShadow: '4px 4px 12px rgba(79, 70, 229, 0.35)'
                }}
              >
                <PlusCircle size={30} color="#ffffff" />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#1e293b', marginBottom: '8px' }}>
                1. Create Room
              </h3>
              <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.5 }}>
                Start a fresh canvas as host. Configure Public or Private security with autogenerated password.
              </p>
            </div>
            <div style={{ marginTop: '24px' }}>
              <button
                type="button"
                className="neu-button neu-button-primary"
                style={{ width: '100%', height: '46px', fontSize: '14px' }}
              >
                New Canvas Room
              </button>
            </div>
          </div>

          {/* Option 2: Join Room */}
          <div
            onClick={() => setShowJoinModal(true)}
            className="neu-card"
            style={{
              padding: '36px 28px',
              cursor: 'pointer',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '20px',
                  boxShadow: '4px 4px 12px rgba(16, 185, 129, 0.35)'
                }}
              >
                <Users size={30} color="#ffffff" />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#1e293b', marginBottom: '8px' }}>
                2. Join Room
              </h3>
              <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.5 }}>
                Have a Room ID and Room Name from a peer? Connect right away and sketch together in real time.
              </p>
            </div>
            <div style={{ marginTop: '24px' }}>
              <button
                type="button"
                className="neu-button"
                style={{ width: '100%', height: '46px', fontSize: '14px', fontWeight: '700' }}
              >
                Enter Existing Room
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      <CreateRoomModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onRoomCreated={(room) => onEnterRoom(room)}
      />

      <JoinRoomModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onRoomJoined={(room) => onEnterRoom(room)}
      />
    </div>
  );
};
