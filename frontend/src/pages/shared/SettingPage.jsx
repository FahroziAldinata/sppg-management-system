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
        <div style={{ maxWidth: '500px' }}>
            <h2>Pengaturan Profil &amp; Akun</h2>
            <p style={{ color: '#666', fontSize: '13px', marginTop: '0' }}>
                Perbarui nama tampilan, username, atau kata sandi Anda di sini.
            </p>

            {error && <div style={{ color: 'red', marginBottom: '10px', padding: '8px', border: '1px solid red' }}>{error}</div>}
            {success && <div style={{ color: 'green', marginBottom: '10px', padding: '8px', border: '1px solid green' }}>{success}</div>}

            <form onSubmit={handleUpdateProfile} style={{ border: '1px solid #ccc', padding: '15px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '3px', fontWeight: '500' }}>Nama Lengkap: </label>
                    <input
                        type="text"
                        value={nama}
                        onChange={e => setNama(e.target.value)}
                        style={{ width: '100%', padding: '5px' }}
                        required
                    />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '3px', fontWeight: '500' }}>Username: </label>
                    <input
                        type="text"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        style={{ width: '100%', padding: '5px' }}
                        required
                    />
                </div>
                <hr style={{ border: '0', borderTop: '1px solid #eee', margin: '5px 0' }} />
                <div>
                    <label style={{ display: 'block', marginBottom: '3px', fontWeight: '500' }}>Kata Sandi Baru (opsional): </label>
                    <input
                        type="password"
                        placeholder="Kosongkan jika tidak ingin mengubah"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        style={{ width: '100%', padding: '5px' }}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '3px', fontWeight: '500' }}>Konfirmasi Kata Sandi Baru: </label>
                    <input
                        type="password"
                        placeholder="Ulangi kata sandi baru"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        style={{ width: '100%', padding: '5px' }}
                    />
                </div>

                <div style={{ marginTop: '10px' }}>
                    <button
                        type="submit"
                        disabled={loading}
                        style={{ padding: '6px 15px', backgroundColor: '#007bff', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        {loading ? 'Menyimpan...' : 'Perbarui Profil'}
                    </button>
                </div>
            </form>
        </div>
    );
};
