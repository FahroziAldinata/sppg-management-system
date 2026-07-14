// Dropdown.jsx
import { useState, useRef, useEffect, useId } from "react";
import { createPortal } from "react-dom";

export default function Dropdown({
  options,           // [{ value, label }]
  value,
  onChange,
  placeholder = "Pilih...",
  style,             // ex: { width: 300 } kalau mau samain sample lama
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const id = useId();

  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const selected = options.find((o) => o.value === value);

  // Update posisi dropdown berdasarkan trigger button
  const updateCoords = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  };

  useEffect(() => {
    function onClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        // Cek juga jika klik terjadi di dalam portal agar tidak langsung menutup
        const portalEl = document.getElementById(`portal-${id}`);
        if (portalEl && portalEl.contains(e.target)) {
          return;
        }
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [id]);

  useEffect(() => {
    if (open) {
      updateCoords();
      window.addEventListener("resize", updateCoords);
      window.addEventListener("scroll", updateCoords, true);
    }
    return () => {
      window.removeEventListener("resize", updateCoords);
      window.removeEventListener("scroll", updateCoords, true);
    };
  }, [open]);

  function openList() {
    if (disabled) return;
    updateCoords();
    setOpen(true);
    setActiveIndex(Math.max(0, options.findIndex((o) => o.value === value)));
  }

  function selectOption(opt) {
    onChange(opt.value);
    setOpen(false);
  }

  function onKeyDown(e) {
    if (disabled) return;
    if (!open && ["Enter", " ", "ArrowDown"].includes(e.key)) {
      e.preventDefault();
      openList();
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0) selectOption(options[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="custom-select-container" ref={containerRef} style={style}>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        className={`custom-select-trigger${open ? " active" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        disabled={disabled}
      >
        <span>{selected ? selected.label : placeholder}</span>
        <svg
          className="dropdown-chevron"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ marginLeft: 8 }}
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open &&
        createPortal(
          <ul
            id={`portal-${id}`}
            className="custom-select-dropdown"
            role="listbox"
            aria-labelledby={id}
            style={{
              position: "absolute",
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              margin: 0,
              zIndex: 99999, // Overlap list agar di paling depan
            }}
          >
            {options.map((opt, i) => (
              <li
                key={opt.value}
                role="option"
                aria-selected={opt.value === value}
                tabIndex={-1}
                className={`custom-select-option${opt.value === value ? " selected" : ""}${
                  i === activeIndex ? " hovered" : ""
                }`}
                onMouseDown={(e) => e.preventDefault()} // cegah blur sebelum onClick
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => selectOption(opt)}
              >
                {opt.label}
              </li>
            ))}
          </ul>,
          document.body
        )}
    </div>
  );
}