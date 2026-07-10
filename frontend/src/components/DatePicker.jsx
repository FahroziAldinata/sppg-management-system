import React, { useState, useEffect, useRef, useId } from 'react';
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
    const [open, setOpen] = useState(false);
    const containerRef = useRef(null);
    const triggerRef = useRef(null);
    const id = useId();

    const close = () => {
        setOpen(false);
        triggerRef.current?.blur();
    };

    useEffect(() => {
        function onClickOutside(e) {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                close();
            }
        }
        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, []);

    const handleDateChange = (val) => {
        if (onChange) {
            onChange(val ? val.toString() : '');
        }
        close();
    };

    function onKeyDown(e) {
        if (!open && ['Enter', ' ', 'ArrowDown'].includes(e.key)) {
            e.preventDefault();
            if (!disabled) setOpen(true);
            return;
        }
        if (!open) return;
        if (e.key === 'Escape') {
            close();
        }
    }

    return (
        <div
            ref={containerRef}
            className={`custom-select-container${className ? ` ${className}` : ''}`}
            style={style}
        >
            <button
                type="button"
                id={id}
                ref={triggerRef}
                className={`custom-select-trigger form-field-picker${open ? ' active' : ''}`}
                aria-haspopup="dialog"
                aria-expanded={open}
                disabled={disabled}
                onClick={() => {
                    if (disabled) return;
                    open ? close() : setOpen(true);
                }}
                onKeyDown={onKeyDown}
            >
                <span>{value || placeholder}</span>
                <span aria-hidden style={{ marginLeft: 8, opacity: 0.6 }}>▾</span>
            </button>
            {required && (
                <input
                    type="text"
                    value={value}
                    required
                    tabIndex={-1}
                    aria-hidden
                    style={{ opacity: 0, height: 0, width: 0, position: 'absolute', pointerEvents: 'none' }}
                    onChange={() => {}}
                />
            )}
            {open && !disabled && (
                <div className="form-field-popover">
                    <Calendar
                        value={value ? parseDate(value) : null}
                        onChange={handleDateChange}
                    />
                </div>
            )}
        </div>
    );
}
