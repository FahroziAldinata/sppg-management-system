import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { User, Lock, LogIn, Sun, Moon } from 'lucide-react';

export const Login = () => {
  const { token, login, theme, toggleTheme } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginSuccessUser, setLoginSuccessUser] = useState(null);

  if (token) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (res.ok) {
        setLoginSuccessUser(data.user);
        setTimeout(() => {
          login(data.token, data.user);
          navigate('/');
        }, 1200);
      } else {
        setError(data.error || 'Terjadi kesalahan');
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setError('Koneksi ke server gagal.');
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg)',
      overflow: 'hidden',
      padding: '20px'
    }}>
      {/* Morphing Blob SVGs in the background for mesh gradient effect */}
      <div style={{
        position: 'absolute',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, var(--color-primary-light) 0%, rgba(255,255,255,0) 70%)',
        top: '-10%',
        left: '-10%',
        opacity: 0.4,
        filter: 'blur(80px)',
        zIndex: 0,
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        width: '600px',
        height: '600px',
        background: 'radial-gradient(circle, var(--color-primary) 0%, rgba(255,255,255,0) 75%)',
        bottom: '-15%',
        right: '-10%',
        opacity: 0.35,
        filter: 'blur(100px)',
        zIndex: 0,
        pointerEvents: 'none'
      }} />

      {/* Login Card */}
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '420px',
        padding: '40px 30px',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-hover)',
        zIndex: 1,
        position: 'relative'
      }}>
        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          title={theme === 'light' ? 'Ganti ke Mode Gelap' : 'Ganti ke Mode Terang'}
          style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            width: '34px',
            height: '34px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--bg-elevated)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text)',
            transition: 'all var(--transition-fast)',
            zIndex: 10
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--border)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'; }}
        >
          {theme === 'light' ? <Moon size={16} strokeWidth={2} /> : <Sun size={16} strokeWidth={2} />}
        </button>

        {/* Header Title */}
        <div style={{ textAlign: 'center', marginBottom: '35px' }}>
          <img
            src={theme === 'dark' ? '/icons/logo-bgn-dark.png' : '/icons/logo-bgn-light.png'}
            alt="SIKOP-SPPG Logo"
            style={{
              height: '52px',
              objectFit: 'contain',
              margin: '0 auto 15px auto',
              display: 'block'
            }}
          />
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text)', letterSpacing: '-0.5px' }}>Selamat Datang</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '5px' }}>Masuk ke akun SIKOP-SPPG Anda untuk melapor</p>
        </div>

        {error && (
          <div style={{
            color: 'var(--color-danger)',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            padding: '12px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13px',
            fontWeight: '500',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Username Input */}
          <div>
            <label htmlFor="username" style={{
              textTransform: 'uppercase',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.07em',
              color: 'var(--text-muted)',
              display: 'block',
              marginBottom: '6px'
            }}>
              Username
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <User size={16} strokeWidth={2} />
              </span>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username"
                required
                style={{
                  width: '100%',
                  padding: '12px 12px 12px 38px',
                  backgroundColor: 'var(--bg)',
                  border: '1px solid var(--input-border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text)',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label htmlFor="password" style={{
              textTransform: 'uppercase',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.07em',
              color: 'var(--text-muted)',
              display: 'block',
              marginBottom: '6px'
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <Lock size={16} strokeWidth={2} />
              </span>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                required
                style={{
                  width: '100%',
                  padding: '12px 12px 12px 38px',
                  backgroundColor: 'var(--bg)',
                  border: '1px solid var(--input-border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text)',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: 'var(--btn-primary-bg)',
              color: 'var(--btn-primary-text)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '10px'
            }}
          >
            {loading ? 'Memverifikasi...' : 'Masuk'}
          </button>
        </form>
      </div>

      {/* Loading & Success Popup Modal */}
      {(loading || loginSuccessUser) && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(7, 30, 73, 0.4)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          transition: 'all 0.3s ease'
        }}>
          <div className="glass-panel" style={{
            padding: '30px 40px',
            borderRadius: 'var(--radius-lg)',
            textAlign: 'center',
            boxShadow: 'var(--shadow-hover)',
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            maxWidth: '320px',
            width: '100%',
            animation: 'scaleUp 0.2s ease-out'
          }}>
            <style>{`
              @keyframes scaleUp {
                from { transform: scale(0.95); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
              }
            `}</style>

            {loginSuccessUser ? (
              <div>
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  color: 'var(--color-success)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 15px auto',
                  fontSize: '24px',
                  fontWeight: 'bold'
                }}>
                  ✓
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px', color: 'var(--text)' }}>Login Berhasil</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                  Selamat datang kembali, <strong style={{ color: 'var(--text)' }}>{loginSuccessUser.nama}</strong>!
                </p>
              </div>
            ) : (
              <div>
                <div className="skeleton-shimmer" style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius-full)',
                  margin: '0 auto 15px auto',
                  opacity: 0.3
                }} />
                <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px', color: 'var(--text)' }}>Memproses</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Sedang memverifikasi kredensial...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
