/**
 * NumberInput - Komponen Input Angka dengan Pemisah Ribuan (Format Rupiah/Indonesia)
 * 
 * Komponen ini menerima nilai angka murni (number atau '') dan mengembalikan nilai angka murni
 * via callback onChange (bukan event object, melainkan nilai angka murni / kosong langsung).
 * 
 * Cara Penggunaan / Contoh Pemanggilan:
 * 
 * import { NumberInput } from '../../components/NumberInput';
 * 
 * // Di dalam komponen Parent:
 * const [nominal, setNominal] = useState(10000000); // 10 Juta murni
 * 
 * <NumberInput
 *   value={nominal}
 *   onChange={(val) => setNominal(val)} // val berupa number murni (misal: 10000000) atau ''
 *   placeholder="Masukkan nominal"
 *   className="form-field"
 *   required
 * />
 */

import React, { useRef, useLayoutEffect, useState } from 'react';

export const NumberInput = ({
  value,
  onChange,
  placeholder = '',
  className = 'form-field',
  style = {},
  required = false,
  disabled = false,
  min,
  ...rest
}) => {
  const inputRef = useRef(null);
  const [cursorInfo, setCursorInfo] = useState(null);

  // Mengubah number menjadi format lokal Indonesia "10.000.000"
  const formatValue = (num) => {
    if (num === undefined || num === null || num === '') return '';
    return Number(num).toLocaleString('id-ID');
  };

  const displayValue = formatValue(value);

  const handleInputChange = (e) => {
    const inputEl = e.target;
    const originalVal = inputEl.value;

    // 1. Simpan posisi kursor dan hitung jumlah digit angka sebelum kursor
    const selStart = inputEl.selectionStart;
    const digitsBeforeCursor = originalVal.slice(0, selStart).replace(/\D/g, '').length;

    // 2. Bersihkan input: hanya izinkan karakter angka
    const cleanStr = originalVal.replace(/\D/g, '');

    let numericValue = '';
    if (cleanStr !== '') {
      numericValue = parseInt(cleanStr, 10);
    }

    // 3. Simpan info kursor untuk direstore setelah render ulang
    setCursorInfo({
      digitsBeforeCursor
    });

    // 4. Panggil onChange dengan value angka murni
    onChange(numericValue);
  };

  // Kembalikan posisi kursor setelah nilai di-format dan DOM di-render ulang
  useLayoutEffect(() => {
    if (cursorInfo && inputRef.current) {
      const inputEl = inputRef.current;
      const newValue = inputEl.value;

      let newSelStart = 0;
      let digitCount = 0;

      // Cari indeks di mana jumlah digit angka cocok dengan digitsBeforeCursor
      while (newSelStart < newValue.length && digitCount < cursorInfo.digitsBeforeCursor) {
        if (/\d/.test(newValue[newSelStart])) {
          digitCount++;
        }
        newSelStart++;
      }

      inputEl.setSelectionRange(newSelStart, newSelStart);
      setCursorInfo(null);
    }
  }, [value, cursorInfo]);

  return (
    <input
      ref={inputRef}
      type="text"
      value={displayValue}
      onChange={handleInputChange}
      placeholder={placeholder}
      className={className}
      style={style}
      required={required}
      disabled={disabled}
      min={min}
      {...rest}
    />
  );
};
