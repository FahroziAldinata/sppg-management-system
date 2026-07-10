// Dropdown.jsx
import { useState, useRef, useEffect, useId } from "react";

export default function Dropdown({
  options,           // [{ value, label }]
  value,
  onChange,
  placeholder = "Pilih...",
  style,             // ex: { width: 300 } kalau mau samain sample lama
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef(null);
  const id = useId();

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    function onClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function openList() {
    setOpen(true);
    setActiveIndex(Math.max(0, options.findIndex((o) => o.value === value)));
  }

  function selectOption(opt) {
    onChange(opt.value);
    setOpen(false);
  }

  function onKeyDown(e) {
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
        type="button"
        id={id}
        className={`custom-select-trigger${open ? " active" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
      >
        <span>{selected ? selected.label : placeholder}</span>
        <span aria-hidden style={{ marginLeft: 8, opacity: 0.6 }}>▾</span>
      </button>

      {open && (
        <ul className="custom-select-dropdown" role="listbox" aria-labelledby={id}>
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
        </ul>
      )}
    </div>
  );
}