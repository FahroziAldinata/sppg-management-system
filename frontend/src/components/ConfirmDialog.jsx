import React, { useState, useEffect } from 'react';
import { Button } from './Button';

export function ConfirmDialog({ open, title, message, onConfirm, onCancel, requireInput, inputPlaceholder, inputRequired, errorMessage }) {
    const [inputValue, setInputValue] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (open) {
            setInputValue('');
            setError('');
        }
    }, [open]);

    if (!open) return null;

    const handleConfirm = () => {
        if (requireInput && inputRequired && inputValue.trim() === '') {
            setError(errorMessage || 'Catatan wajib diisi untuk melanjutkan.');
            return;
        }
        if (requireInput) {
            onConfirm(inputValue);
        } else {
            onConfirm();
        }
    };

    const handleInputChange = (e) => {
        setInputValue(e.target.value);
        if (error) setError('');
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
        }}>
            <div style={{
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '24px',
                width: '90%',
                maxWidth: '450px',
                boxShadow: 'var(--shadow-hover)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
            }}>
                <h3 style={{
                    margin: 0,
                    fontSize: '16px',
                    fontWeight: 700,
                    color: 'var(--text)'
                }}>{title}</h3>

                <p style={{
                    margin: 0,
                    fontSize: '14px',
                    color: 'var(--text-muted)',
                    lineHeight: '1.5'
                }}>{message}</p>

                {requireInput && (
                    <>
                        <textarea
                            placeholder={inputPlaceholder || 'Masukkan catatan di sini...'}
                            value={inputValue}
                            onChange={handleInputChange}
                            style={{
                                width: '100%',
                                minHeight: '80px',
                                padding: '10px',
                                borderRadius: 'var(--radius-sm)',
                                border: `1px solid ${error ? 'var(--color-danger)' : 'var(--border)'}`,
                                backgroundColor: 'var(--bg)',
                                color: 'var(--text)',
                                fontSize: '13px',
                                outline: 'none',
                                fontFamily: 'inherit',
                                resize: 'vertical',
                                boxSizing: 'border-box'
                            }}
                        />
                        {error && (
                            <span style={{
                                fontSize: '12px',
                                color: 'var(--color-danger)',
                                marginTop: '-8px'
                            }}>
                                {error}
                            </span>
                        )}
                    </>
                )}

                <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '12px',
                    marginTop: '8px'
                }}>
                    <Button variant="quiet" onPress={onCancel}>
                        Batal
                    </Button>
                    <Button variant="primary" onPress={handleConfirm}>
                        Konfirmasi
                    </Button>
                </div>
            </div>
        </div>
    );
}
