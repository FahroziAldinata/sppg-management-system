import React, { useState, useEffect, useMemo } from 'react';
import { Table } from './Table';
import { generateDateRange } from './utils';

export const NominatifUpahGrid = ({
  periode,
  hariLiburList = [],
  jenisPekerjaanOptions = [],
  existingData = [],
  onSave
}) => {
  const [rows, setRows] = useState([]);

  // Initialize/sync local state from existingData
  useEffect(() => {
    const formatted = (existingData || []).map((item, idx) => ({
      _gridId: item.id || `existing_${idx}_${Date.now()}`,
      id: item.id,
      namaRelawan: item.namaRelawan || '',
      jenisPekerjaan: item.jenisPekerjaan || '',
      tarifHarian: item.tarifHarian || '',
      danaKesehatan: item.danaKesehatan || '',
      tk: item.tk || '',
      pj: item.pj || '',
      detailHarian: (item.detailHarian || []).reduce((acc, dh) => {
        const dateStr = new Date(dh.tanggal).toISOString().split('T')[0];
        acc[dateStr] = dh.nominal;
        return acc;
      }, {})
    }));

    // Append one empty placeholder row for adding new record
    formatted.push({
      _gridId: `new_init_${Date.now()}`,
      isNewRow: true,
      namaRelawan: '',
      jenisPekerjaan: '',
      tarifHarian: '',
      danaKesehatan: '',
      tk: '',
      pj: '',
      detailHarian: {}
    });

    setRows(formatted);
  }, [existingData, periode]);

  const handleCellChange = (gridId, field, value) => {
    setRows(prev => {
      let updated = prev.map(row => {
        if (row._gridId === gridId) {
          const updatedRow = { ...row, [field]: value };
          if (row.isNewRow) {
            updatedRow.isNewRow = false;
          }
          return updatedRow;
        }
        return row;
      });

      const lastRow = updated[updated.length - 1];
      if (lastRow && !lastRow.isNewRow) {
        updated.push({
          _gridId: `new_${Date.now()}`,
          isNewRow: true,
          namaRelawan: '',
          jenisPekerjaan: '',
          tarifHarian: '',
          danaKesehatan: '',
          tk: '',
          pj: '',
          detailHarian: {}
        });
      }
      return updated;
    });
  };

  const handleJpChange = (gridId, jpName) => {
    const found = jenisPekerjaanOptions.find(jp => jp.nama === jpName);
    const tarif = found ? found.tarifHarian : '';

    setRows(prev => {
      let updated = prev.map(row => {
        if (row._gridId === gridId) {
          const updatedRow = {
            ...row,
            jenisPekerjaan: jpName,
            tarifHarian: tarif
          };

          // Auto-fill detailHarian for working days
          const dateRange = generateDateRange(periode.tanggalMulai, periode.tanggalSelesai);
          const newDetail = { ...row.detailHarian };
          dateRange.forEach(date => {
            const dateStr = date.toISOString().split('T')[0];
            const isSunday = date.getDay() === 0;
            const isLibur = (hariLiburList || []).some(hl => {
              const hlDate = new Date(hl.tanggal);
              return hlDate.toISOString().split('T')[0] === dateStr;
            });

            if (!isSunday && !isLibur) {
              if (newDetail[dateStr] === undefined) {
                newDetail[dateStr] = tarif;
              }
            }
          });

          updatedRow.detailHarian = newDetail;

          if (row.isNewRow) {
            updatedRow.isNewRow = false;
          }
          return updatedRow;
        }
        return row;
      });

      const lastRow = updated[updated.length - 1];
      if (lastRow && !lastRow.isNewRow) {
        updated.push({
          _gridId: `new_${Date.now()}`,
          isNewRow: true,
          namaRelawan: '',
          jenisPekerjaan: '',
          tarifHarian: '',
          danaKesehatan: '',
          tk: '',
          pj: '',
          detailHarian: {}
        });
      }
      return updated;
    });
  };

  const handleDetailChange = (gridId, dateStr, value) => {
    setRows(prev => prev.map(row => {
      if (row._gridId === gridId) {
        const updatedRow = {
          ...row,
          detailHarian: {
            ...row.detailHarian,
            [dateStr]: value !== '' ? parseFloat(value) : undefined
          }
        };
        if (row.isNewRow) {
          updatedRow.isNewRow = false;
        }
        return updatedRow;
      }
      return row;
    }));
  };

  const formatRupiah = (number) => {
    if (!number) return 'Rp0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(number);
  };

  // Calculate total row values across all rows (excluding isNewRow)
  const totalRow = useMemo(() => {
    const activeRows = rows.filter(r => !r.isNewRow);

    const totalPerTanggal = {};
    if (periode?.tanggalMulai && periode?.tanggalSelesai) {
      const dates = generateDateRange(periode.tanggalMulai, periode.tanggalSelesai);
      dates.forEach(date => {
        const dateStr = date.toISOString().split('T')[0];
        totalPerTanggal[dateStr] = activeRows.reduce((sum, r) => sum + (Number(r.detailHarian[dateStr]) || 0), 0);
      });
    }

    const totalHonorarium = activeRows.reduce((sum, r) => {
      const rowHonorarium = Object.values(r.detailHarian).reduce((s, v) => s + (Number(v) || 0), 0);
      return sum + rowHonorarium;
    }, 0);

    const totalDanaKesehatan = activeRows.reduce((sum, r) => sum + (Number(r.danaKesehatan) || 0), 0);
    const totalTk = activeRows.reduce((sum, r) => sum + (Number(r.tk) || 0), 0);
    const totalPj = activeRows.reduce((sum, r) => sum + (Number(r.pj) || 0), 0);
    const totalUpahKeseluruhan = totalHonorarium + totalDanaKesehatan + totalTk + totalPj;

    return {
      _gridId: 'TOTAL_ROW',
      isTotalRow: true,
      totalPerTanggal,
      totalHonorarium,
      totalDanaKesehatan,
      totalTk,
      totalPj,
      totalUpahKeseluruhan
    };
  }, [rows, periode]);

  // Combine rows with total row at the end
  const tableData = useMemo(() => {
    return [...rows, totalRow];
  }, [rows, totalRow]);

  // Build dynamic columns
  const columns = useMemo(() => {
    const cols = [
      {
        key: 'namaRelawan',
        header: 'Nama Relawan',
        width: 180,
        render: (value, row) => {
          if (row.isTotalRow) {
            return (
              <div style={{ position: 'sticky', left: 0, backgroundColor: 'var(--table-header-bg)', zIndex: 1, padding: '4px', fontWeight: 'bold', fontSize: '14px', color: 'var(--text)' }}>
                TOTAL
              </div>
            );
          }
          return (
            <div style={{ position: 'sticky', left: 0, backgroundColor: 'var(--bg-elevated)', zIndex: 1, padding: '4px' }}>
              <input
                type="text"
                placeholder="Nama Relawan"
                value={row.namaRelawan}
                onChange={(e) => handleCellChange(row._gridId, 'namaRelawan', e.target.value)}
                className="form-field"
                style={{ width: '100%', minWidth: '120px' }}
              />
            </div>
          );
        }
      },
      {
        key: 'jenisPekerjaan',
        header: 'Jenis Pekerjaan',
        width: 200,
        render: (value, row) => {
          if (row.isTotalRow) {
            return (
              <div style={{ position: 'sticky', left: 180, backgroundColor: 'var(--table-header-bg)', zIndex: 1, padding: '4px', fontWeight: 'bold', color: 'var(--text-muted)' }}>
                —
              </div>
            );
          }
          return (
            <div style={{ position: 'sticky', left: 180, backgroundColor: 'var(--bg-elevated)', zIndex: 1, padding: '4px' }}>
              <select
                value={row.jenisPekerjaan}
                onChange={(e) => handleJpChange(row._gridId, e.target.value)}
                className="form-field"
                style={{ width: '100%', minWidth: '150px' }}
              >
                <option value="">-- Pilih --</option>
                {jenisPekerjaanOptions.map(option => (
                  <option key={option.id} value={option.nama}>
                    {option.nama} ({formatRupiah(option.tarifHarian)})
                  </option>
                ))}
              </select>
            </div>
          );
        }
      }
    ];

    if (periode?.tanggalMulai && periode?.tanggalSelesai) {
      const dates = generateDateRange(periode.tanggalMulai, periode.tanggalSelesai);
      dates.forEach(date => {
        const dateStr = date.toISOString().split('T')[0];
        const dayNum = date.getDate();
        const isSunday = date.getDay() === 0;
        const isLibur = (hariLiburList || []).some(hl => {
          const hlDate = new Date(hl.tanggal);
          return hlDate.toISOString().split('T')[0] === dateStr;
        });

        cols.push({
          key: `date_${dateStr}`,
          header: (
            <div style={isSunday || isLibur ? { backgroundColor: '#ffebee', color: '#c62828', padding: '6px', borderRadius: '4px', textAlign: 'center', fontSize: '12px', fontWeight: 'bold' } : { textAlign: 'center' }}>
              {dayNum}
            </div>
          ),
          align: 'center',
          width: 70,
          render: (value, row) => {
            if (row.isTotalRow) {
              const totalVal = row.totalPerTanggal[dateStr] || 0;
              return (
                <div style={isSunday || isLibur ? { backgroundColor: '#ffebee', padding: '4px', display: 'flex', justifyContent: 'center', fontWeight: 'bold', fontVariantNumeric: 'tabular-nums', color: 'var(--text)' } : { display: 'flex', justifyContent: 'center', fontWeight: 'bold', fontVariantNumeric: 'tabular-nums', color: 'var(--text)' }}>
                  {formatRupiah(totalVal)}
                </div>
              );
            }
            const isChecked = row.detailHarian[dateStr] !== undefined && row.detailHarian[dateStr] !== '' && row.detailHarian[dateStr] !== null;
            return (
              <div style={
                isSunday || isLibur 
                  ? { backgroundColor: '#ffebee', padding: '4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' } 
                  : { padding: '4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }
              }>
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => {
                    if (e.target.checked) {
                      handleDetailChange(row._gridId, dateStr, row.tarifHarian);
                    } else {
                      handleDetailChange(row._gridId, dateStr, '');
                    }
                  }}
                  style={{
                    width: '18px',
                    height: '18px',
                    cursor: 'pointer'
                  }}
                />
                {isChecked && (
                  <input
                    type="number"
                    value={row.detailHarian[dateStr] ?? ''}
                    onChange={(e) => handleDetailChange(row._gridId, dateStr, e.target.value)}
                    style={{
                      width: '52px',
                      fontSize: '11px',
                      textAlign: 'center',
                      padding: '2px',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--bg)',
                      color: 'var(--text)'
                    }}
                    className="form-field"
                  />
                )}
              </div>
            );
          }
        });
      });
    }

    cols.push(
      {
        key: 'honorarium',
        header: 'Honorarium Sukarelawan',
        width: 180,
        align: 'right',
        render: (value, row) => {
          if (row.isTotalRow) {
            return (
              <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--text)' }}>
                {formatRupiah(row.totalHonorarium)}
              </span>
            );
          }
          const honorarium = Object.values(row.detailHarian).reduce((sum, v) => sum + (Number(v) || 0), 0);
          return (
            <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: 'var(--text)' }}>
              {formatRupiah(honorarium)}
            </span>
          );
        }
      },
      {
        key: 'danaKesehatan',
        header: 'Kesehatan',
        width: 110,
        render: (value, row) => {
          if (row.isTotalRow) {
            return (
              <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--text)' }}>
                {formatRupiah(row.totalDanaKesehatan)}
              </span>
            );
          }
          return (
            <input
              type="number"
              placeholder="Rp"
              value={row.danaKesehatan}
              onChange={(e) => handleCellChange(row._gridId, 'danaKesehatan', e.target.value)}
              className="form-field"
              style={{ width: '100%', minWidth: '85px' }}
            />
          );
        }
      },
      {
        key: 'tk',
        header: 'TK',
        width: 110,
        render: (value, row) => {
          if (row.isTotalRow) {
            return (
              <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--text)' }}>
                {formatRupiah(row.totalTk)}
              </span>
            );
          }
          return (
            <input
              type="number"
              placeholder="Rp"
              value={row.tk}
              onChange={(e) => handleCellChange(row._gridId, 'tk', e.target.value)}
              className="form-field"
              style={{ width: '100%', minWidth: '85px' }}
            />
          );
        }
      },
      {
        key: 'pj',
        header: 'PJ',
        width: 110,
        render: (value, row) => {
          if (row.isTotalRow) {
            return (
              <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--text)' }}>
                {formatRupiah(row.totalPj)}
              </span>
            );
          }
          return (
            <input
              type="number"
              placeholder="Rp"
              value={row.pj}
              onChange={(e) => handleCellChange(row._gridId, 'pj', e.target.value)}
              className="form-field"
              style={{ width: '100%', minWidth: '85px' }}
            />
          );
        }
      },
      {
        key: 'totalUpah',
        header: 'Total Upah',
        width: 180,
        align: 'right',
        render: (value, row) => {
          if (row.isTotalRow) {
            return (
              <strong style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--text)' }}>
                {formatRupiah(row.totalUpahKeseluruhan)}
              </strong>
            );
          }
          const honorarium = Object.values(row.detailHarian).reduce((sum, v) => sum + (Number(v) || 0), 0);
          const total = honorarium + (Number(row.danaKesehatan) || 0) + (Number(row.tk) || 0) + (Number(row.pj) || 0);
          return (
            <strong style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--text)' }}>
              {formatRupiah(total)}
            </strong>
          );
        }
      }
    );

    return cols;
  }, [periode, hariLiburList, jenisPekerjaanOptions]);

  const handleSave = () => {
    const validRows = rows.filter(row => !row.isNewRow && row.namaRelawan.trim() !== '');
    onSave(validRows);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
        <Table
          columns={columns}
          data={tableData}
          emptyText="Tidak ada data."
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={handleSave}
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
          Simpan Semua
        </button>
      </div>
    </div>
  );
};
