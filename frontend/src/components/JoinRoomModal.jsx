import React, { useState } from 'react';
import { api } from '../services/api';
import { Users, Key, X, AlertCircle, ArrowRight } from 'lucide-react';

export const JoinRoomModal = ({ isOpen, onClose, onRoomJoined }) => {
  const [roomid, setRoomid] = useState('');
  const [roomname, setRoomname] = useState('');
  const [password, setPassword] = useState('');
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!roomid.trim() || !roomname.trim()) {
      setError('Both Room ID and Room Name are required to join.');
      return;
    }

    if (requiresPassword && !password.trim()) {
      setError('Please enter the 5-digit room password.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const data = await api.joinRoomCheck(roomid.trim(), roomname.trim(), password.trim());
      if (data && data.room) {
        onRoomJoined(data.room);
        onClose();
      }
    } catch (err) {
      if (err.message && err.message.toLowerCase().includes('private')) {
        setRequiresPassword(true);
      }
      setError(err.message || 'Failed to join room. Please verify the credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="neu-modal-backdrop">
      <div className="neu-card neu-modal" style={{ width: '100%', maxWidth: '440px', padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff'
              }}
            >
              <Users size={20} />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#1e293b' }}>Join Room</h2>
          </div>
          <button
            onClick={onClose}
            className="neu-button"
            style={{ width: '36px', height: '36px', padding: 0, borderRadius: '50%' }}
          >
            <X size={18} color="#64748b" />
          </button>
        </div>

        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              marginBottom: '16px',
              borderRadius: '8px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              fontSize: '13px'
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
              ROOM ID
            </label>
            <input
              type="text"
              required
              placeholder="e.g. ROOM-123456"
              value={roomid}
              onChange={(e) => setRoomid(e.target.value.toUpperCase())}
              className="neu-input"
              style={{ fontFamily: 'var(--font-mono)' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
              ROOM NAME
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Design Sprint Alpha"
              value={roomname}
              onChange={(e) => setRoomname(e.target.value)}
              className="neu-input"
            />
          </div>

          {requiresPassword && (
            <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#dc2626', marginBottom: '6px' }}>
                5-DIGIT PRIVATE ROOM PASSWORD
              </label>
              <div style={{ position: 'relative' }}>
                <Key size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  maxLength={5}
                  placeholder="e.g. K7M2P"
                  value={password}
                  onChange={(e) => setPassword(e.target.value.toUpperCase())}
                  className="neu-input"
                  style={{ paddingLeft: '42px', fontFamily: 'var(--font-mono)', letterSpacing: '3px', fontWeight: '700' }}
                />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              className="neu-button"
              style={{ flex: 1, height: '46px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="neu-button neu-button-primary"
              style={{ flex: 1, height: '46px' }}
            >
              {loading ? 'Joining...' : 'Enter Canvas'}
              <ArrowRight size={16} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
