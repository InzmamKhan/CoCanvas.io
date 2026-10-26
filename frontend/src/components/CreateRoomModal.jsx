import React, { useState } from 'react';
import { api } from '../services/api';
import { PlusCircle, Globe, Lock, X, AlertCircle, ArrowRight } from 'lucide-react';

export const CreateRoomModal = ({ isOpen, onClose, onRoomCreated }) => {
  const [roomname, setRoomname] = useState('');
  const [securityType, setSecurityType] = useState('public'); // 'public' | 'private'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!roomname.trim()) {
      setError('Please provide a name for your room.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const isPrivate = securityType === 'private';
      const data = await api.createRoom(roomname.trim(), isPrivate);
      if (data && data.room) {
        onRoomCreated(data.room);
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Failed to create room. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="neu-modal-backdrop">
      <div className="neu-card neu-modal" style={{ width: '100%', maxWidth: '460px', padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff'
              }}
            >
              <PlusCircle size={20} />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#1e293b' }}>Create Room</h2>
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '8px' }}>
              ROOM NAME
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Design Sprint Alpha"
              value={roomname}
              onChange={(e) => setRoomname(e.target.value)}
              className="neu-input"
              maxLength={40}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '10px' }}>
              SECURITY TYPE
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {/* Public Option */}
              <div
                onClick={() => setSecurityType('public')}
                style={{
                  padding: '14px',
                  borderRadius: '12px',
                  border: securityType === 'public' ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                  background: securityType === 'public' ? '#f5f7ff' : '#f0f3f8',
                  boxShadow: securityType === 'public' ? 'inset 2px 2px 5px #d1d9e6, inset -2px -2px 5px #ffffff' : 'var(--neu-flat-sm)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <input
                    type="radio"
                    name="security"
                    value="public"
                    checked={securityType === 'public'}
                    onChange={() => setSecurityType('public')}
                    style={{ accentColor: '#4f46e5' }}
                  />
                  <span style={{ fontWeight: '700', fontSize: '14px', color: securityType === 'public' ? '#4f46e5' : '#334155' }}>
                    1. Public
                  </span>
                </div>
                <p style={{ fontSize: '11px', color: '#64748b', paddingLeft: '22px' }}>
                  Anyone with the Room ID and Name can enter directly.
                </p>
              </div>

              {/* Private Option */}
              <div
                onClick={() => setSecurityType('private')}
                style={{
                  padding: '14px',
                  borderRadius: '12px',
                  border: securityType === 'private' ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                  background: securityType === 'private' ? '#f5f7ff' : '#f0f3f8',
                  boxShadow: securityType === 'private' ? 'inset 2px 2px 5px #d1d9e6, inset -2px -2px 5px #ffffff' : 'var(--neu-flat-sm)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <input
                    type="radio"
                    name="security"
                    value="private"
                    checked={securityType === 'private'}
                    onChange={() => setSecurityType('private')}
                    style={{ accentColor: '#4f46e5' }}
                  />
                  <span style={{ fontWeight: '700', fontSize: '14px', color: securityType === 'private' ? '#4f46e5' : '#334155' }}>
                    2. Private
                  </span>
                </div>
                <p style={{ fontSize: '11px', color: '#64748b', paddingLeft: '22px' }}>
                  Autogenerates a 5-digit password (letters + numbers).
                </p>
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              background: '#f8fafc',
              border: '1px dashed #cbd5e1',
              fontSize: '12px',
              color: '#64748b',
              lineHeight: 1.5
            }}
          >
            ℹ️ Max 5 people can sketch simultaneously. If you leave as host, the room destroys in 10s.
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
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
              {loading ? 'Creating Room...' : 'Create Room'}
              <ArrowRight size={16} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
