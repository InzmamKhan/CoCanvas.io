import React, { useState } from 'react';
import { useAuth } from '../services/AuthContext';
import { Sparkles, User, Mail, Lock, LogIn, UserPlus, AlertCircle } from 'lucide-react';

export const AuthModal = () => {
  const { login, register } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    loginIdentifier: '' // username or email
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegisterMode) {
        if (!formData.username.trim() || !formData.email.trim() || !formData.password) {
          throw new Error('All fields are required.');
        }
        await register(formData.username.trim(), formData.email.trim(), formData.password);
      } else {
        if (!formData.loginIdentifier.trim() || !formData.password) {
          throw new Error('Please enter your email or username, and password.');
        }
        await login(formData.loginIdentifier.trim(), formData.password);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="neu-modal-backdrop">
      <div className="neu-card neu-modal" style={{ width: '100%', maxWidth: '440px', padding: '36px 32px' }}>
        {/* Logo / Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '54px',
              height: '54px',
              margin: '0 auto 14px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '4px 4px 12px rgba(79, 70, 229, 0.35), -3px -3px 8px #ffffff'
            }}
          >
            <Sparkles size={28} color="#ffffff" />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px', color: '#1e293b' }}>
            CoCanvas<span style={{ color: '#4f46e5' }}>.io</span>
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {isRegisterMode ? 'Create a unique account to sketch together' : 'Sign in to access your creative boards'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            background: '#e9eef5',
            padding: '4px',
            borderRadius: '12px',
            boxShadow: 'inset 2px 2px 5px #d1d9e6, inset -2px -2px 5px #ffffff',
            marginBottom: '24px'
          }}
        >
          <button
            type="button"
            onClick={() => { setIsRegisterMode(false); setError(''); }}
            style={{
              flex: 1,
              padding: '10px 0',
              border: 'none',
              background: !isRegisterMode ? '#ffffff' : 'transparent',
              borderRadius: '9px',
              fontWeight: '700',
              fontSize: '13px',
              color: !isRegisterMode ? '#4f46e5' : '#64748b',
              boxShadow: !isRegisterMode ? '2px 2px 6px rgba(0,0,0,0.06)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsRegisterMode(true); setError(''); }}
            style={{
              flex: 1,
              padding: '10px 0',
              border: 'none',
              background: isRegisterMode ? '#ffffff' : 'transparent',
              borderRadius: '9px',
              fontWeight: '700',
              fontSize: '13px',
              color: isRegisterMode ? '#4f46e5' : '#64748b',
              boxShadow: isRegisterMode ? '2px 2px 6px rgba(0,0,0,0.06)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Create Account
          </button>
        </div>

        {/* Error notification */}
        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 14px',
              marginBottom: '20px',
              borderRadius: '10px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              fontSize: '13px'
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {isRegisterMode ? (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                  UNIQUE USERNAME
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    required
                    placeholder="e.g. PixelMaster99"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="neu-input"
                    style={{ paddingLeft: '42px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                  EMAIL ADDRESS
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="email"
                    required
                    placeholder="artist@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="neu-input"
                    style={{ paddingLeft: '42px' }}
                  />
                </div>
              </div>
            </>
          ) : (
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                USERNAME OR EMAIL
              </label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  required
                  placeholder="Your username or email"
                  value={formData.loginIdentifier}
                  onChange={(e) => setFormData({ ...formData, loginIdentifier: e.target.value })}
                  className="neu-input"
                  style={{ paddingLeft: '42px' }}
                />
              </div>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
              PASSWORD
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="neu-input"
                style={{ paddingLeft: '42px' }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="neu-button neu-button-primary"
            style={{ width: '100%', marginTop: '10px', height: '48px', fontSize: '15px' }}
          >
            {loading ? (
              'Processing...'
            ) : isRegisterMode ? (
              <>
                <UserPlus size={18} />
                Create Free Account
              </>
            ) : (
              <>
                <LogIn size={18} />
                Sign In
              </>
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <p style={{ fontSize: '12px', color: '#94a3b8' }}>
            {isRegisterMode
              ? 'An automatic unique User ID (USR_XXXX) will be generated for your session.'
              : 'Collaborate with up to 5 teammates on real-time whiteboards.'}
          </p>
        </div>
      </div>
    </div>
  );
};
