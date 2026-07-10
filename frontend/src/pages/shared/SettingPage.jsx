import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';

export const SettingPage = () => {
    const { user, token, login } = useAuth();
    const { request } = useApi();

    const [nama, setNama] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Prefill user details
    useEffect(() => {
        if (user) {
            setNama(user.nama || '');
            setUsername(user.username || '');
        }
    }, [user]);

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (password && password.length < 6) {
            setError('Password minimal harus 6 karakter.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Konfirmasi password tidak cocok.');
            return;
        }

        setLoading(true);
        try {
            const body = { nama, username };
            if (password) {
                body.password = password;
            }

            const r = await request('/auth/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (r.ok) {
                const resJson = await r.json();
                setSuccess('Profil berhasil diperbarui.');
                setPassword('');
                setConfirmPassword('');
                // Update user details in context
                login(token, resJson.user);
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memperbarui profil.' }));
                setError(d.error);
            }
        } catch (err) {
            setError('Terjadi kesalahan koneksi.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <h2 style={{ color: 'var(--text)', marginBottom: '20px' }}>Pengaturan Profil &amp; Akun</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '0', marginBottom: '20px' }}>
                Perbarui nama tampilan, username, atau kata sandi Anda di sini.
            </p>

            {error && (
                <div style={{
                    color: 'var(--color-danger)',
                    marginBottom: '10px',
                    padding: '8px',
                    border: '1px solid var(--color-danger)',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(239, 68, 68, 0.05)'
                }}>
                    {error}
                </div>
            )}
            {success && (
                <div style={{
                    color: 'var(--color-success)',
                    marginBottom: '10px',
                    padding: '8px',
                    border: '1px solid var(--color-success)',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(34, 197, 94, 0.05)'
                }}>
                    {success}
                </div>
            )}

            <form onSubmit={handleUpdateProfile} style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '24px',
                backgroundColor: 'var(--bg-elevated)',
                boxShadow: 'var(--shadow)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
            }}>
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 200px' }}>
                        <label style={{
                            textTransform: 'uppercase',
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: '0.07em',
                            color: 'var(--text-muted)',
                            display: 'block',
                            marginBottom: '6px'
                        }}>
                            Nama Lengkap:
                        </label>
                        <input
                            type="text"
                            value={nama}
                            onChange={e => setNama(e.target.value)}
                            className="form-field"
                            required
                        />
                    </div>
                    <div style={{ flex: '1 1 200px' }}>
                        <label style={{
                            textTransform: 'uppercase',
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: '0.07em',
                            color: 'var(--text-muted)',
                            display: 'block',
                            marginBottom: '6px'
                        }}>
                            Username:
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            className="form-field"
                            required
                        />
                    </div>
                </div>
                <hr style={{ border: '0', borderTop: '1px solid var(--border)', margin: '5px 0' }} />
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 200px' }}>
                        <label style={{
                            textTransform: 'uppercase',
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: '0.07em',
                            color: 'var(--text-muted)',
                            display: 'block',
                            marginBottom: '6px'
                        }}>
                            Kata Sandi Baru (opsional):
                        </label>
                        <input
                            type="password"
                            placeholder="Kosongkan jika tidak ingin mengubah"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="form-field"
                        />
                    </div>
                    <div style={{ flex: '1 1 200px' }}>
                        <label style={{
                            textTransform: 'uppercase',
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: '0.07em',
                            color: 'var(--text-muted)',
                            display: 'block',
                            marginBottom: '6px'
                        }}>
                            Konfirmasi Kata Sandi Baru:
                        </label>
                        <input
                            type="password"
                            placeholder="Ulangi kata sandi baru"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            className="form-field"
                        />
                    </div>
                </div>

                <div style={{ marginTop: '10px' }}>
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: 'var(--btn-primary-bg)',
                            color: 'var(--btn-primary-text)',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '14px'
                        }}
                    >
                        {loading ? 'Menyimpan...' : 'Perbarui Profil'}
                    </button>
                </div>
            </form>
        </div>
    );
};
