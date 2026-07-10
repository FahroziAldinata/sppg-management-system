import React, { useState, useEffect, useRef } from 'react';
import { Calendar } from './Calendar';
import { parseDate } from '@internationalized/date';

export function DatePicker({
    value = '',
    onChange,
    placeholder = 'Pilih Tanggal...',
    required = false,
    style = {},
    className = '',
    disabled = false
}) {
    const [showCalendar, setShowCalendar] = useState(false);
    const calendarRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (calendarRef.current && !calendarRef.current.contains(event.target)) {
                setShowCalendar(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleDateChange = (val) => {
        if (onChange) {
            onChange(val ? val.toString() : '');
        }
        setShowCalendar(false);
    };

    const inputStyle = {
        width: '100%',
        padding: '10px 12px',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--input-border)',
        backgroundColor: disabled ? 'var(--bg-elevated)' : 'var(--bg)',
        color: 'var(--text)',
        fontSize: '14px',
        boxSizing: 'border-box',
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style
    };

    return (
        <div ref={calendarRef} className={className} style={{ position: 'relative', width: '100%' }}>
            <input
                type="text"
                placeholder={placeholder}
                value={value}
                onClick={() => !disabled && setShowCalendar(true)}
                readOnly
                required={required}
                disabled={disabled}
                style={inputStyle}
            />
            {showCalendar && !disabled && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    zIndex: 1000,
                    marginTop: '5px',
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                    boxShadow: 'var(--shadow)'
                }}>
                    <Calendar
                        value={value ? parseDate(value) : null}
                        onChange={handleDateChange}
                    />
                </div>
            )}
        </div>
    );
}
