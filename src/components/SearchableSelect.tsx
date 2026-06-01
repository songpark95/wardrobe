"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Check, ChevronDown, Plus, X } from "lucide-react";

interface Option {
  id: string;
  name: string;
  is_default?: boolean;
}

interface SearchableSelectProps {
  options: Option[];
  value: string | null;
  onChange: (value: string | null) => void;
  onAddNew?: (name: string) => void;
  placeholder?: string;
  emptyLabel?: string;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  onAddNew,
  placeholder = "Search or type...",
  emptyLabel = "No results",
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.id === value);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Fuzzy filter
  const filtered = search
    ? options.filter((o) =>
        o.name.toLowerCase().includes(search.toLowerCase())
      )
    : options;

  // Separate defaults from user-added
  const defaults = filtered.filter((o) => o.is_default);
  const userAdded = filtered.filter((o) => !o.is_default);

  const handleSelect = useCallback(
    (option: Option) => {
      onChange(option.id);
      setOpen(false);
      setSearch("");
    },
    [onChange]
  );

  const handleAddNew = useCallback(() => {
    const trimmed = search.trim();
    if (trimmed && onAddNew) {
      onAddNew(trimmed);
      setSearch("");
    }
  }, [search, onAddNew]);

  return (
    <div ref={ref} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
          if (!open) setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-left flex items-center justify-between gap-2 hover:border-neutral-600 transition-colors"
      >
        <span className={selected ? "text-white truncate" : "text-neutral-500 truncate"}>
          {selected?.name || placeholder}
        </span>
        <ChevronDown size={14} className={`text-neutral-500 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-neutral-800">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Type to search..."
              className="w-full px-3 py-1.5 bg-neutral-800 border border-neutral-700 rounded-md text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500"
            />
          </div>

          {/* Options */}
          <div className="max-h-48 overflow-y-auto">
            {/* Add new option */}
            {search.trim() && onAddNew && (
              <button
                type="button"
                onClick={handleAddNew}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-neutral-800 transition-colors border-b border-neutral-800"
              >
                <Plus size={14} className="text-neutral-400" />
                <span>Add &ldquo;{search.trim()}&rdquo;</span>
              </button>
            )}

            {defaults.length > 0 && (
              <>
                <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-neutral-500 font-medium">
                  Default
                </div>
                {defaults.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelect(opt)}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-white hover:bg-neutral-800 transition-colors"
                  >
                    <span>{opt.name}</span>
                    {opt.id === value && (
                      <Check size={14} className="text-white" />
                    )}
                  </button>
                ))}
              </>
            )}

            {userAdded.length > 0 && (
              <>
                <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-neutral-500 font-medium">
                  Custom
                </div>
                {userAdded.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelect(opt)}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-white hover:bg-neutral-800 transition-colors"
                  >
                    <span>{opt.name}</span>
                    {opt.id === value && (
                      <Check size={14} className="text-white" />
                    )}
                  </button>
                ))}
              </>
            )}

            {filtered.length === 0 && !onAddNew && (
              <div className="px-3 py-4 text-sm text-neutral-500 text-center">
                {emptyLabel}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}