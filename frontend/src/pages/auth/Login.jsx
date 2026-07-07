import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { User, Lock, LogIn } from 'lucide-react';

export const Login = () => {
  const { token, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
        login(data.token, data.user);
        navigate('/');
      } else {
        setError(data.error || 'Terjadi kesalahan');
      }
    } catch (err) {
      console.error(err);
      setError('Koneksi ke server gagal.');
    } finally {
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
        {/* Header Title */}
        <div style={{ textAlign: 'center', marginBottom: '35px' }}>
          <img
            src="/icons/logo-bgn-dark.png"
            alt="STOP-SPPG Logo"
            style={{
              height: '52px',
              objectFit: 'contain',
              margin: '0 auto 15px auto',
              display: 'block'
            }}
          />
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text)', letterSpacing: '-0.5px' }}>Selamat Datang</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '5px' }}>Masuk ke akun STOP-SPPG Anda untuk melapor</p>
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
            <label htmlFor="username" style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--text)' }}>
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
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text)',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label htmlFor="password" style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--text)' }}>
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
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text)',
                  fontSize: '14px'
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
              backgroundColor: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontSize: '14px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '10px',
              boxShadow: '0 4px 12px rgba(7, 30, 73, 0.15)'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.15)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; }}
          >
            {loading ? 'Memverifikasi...' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  );
};
