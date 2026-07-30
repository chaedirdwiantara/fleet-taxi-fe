import { useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { TITLE_PRESETS } from '../titlePresets';

/**
 * Input judul dengan saran preset: tetap text input biasa (ketik apa saja,
 * termasuk melanjutkan preset jadi "Cicilan Deposit Driver Halim") plus daftar
 * saran yang muncul saat diklik/diketik.
 *
 * Daftarnya sengaja dirender inline (absolute), bukan lewat Popover: popover
 * Radix membawa `role="dialog"` sendiri dan komponen ini hidup di dalam Dialog
 * Tambah/Edit. Menutup sendiri saat blur, Escape hanya menutup daftar.
 *
 * Props sisa diteruskan ke <Input> supaya id/aria-* yang disuntikkan
 * FormControl (via Slot) tetap tersambung.
 */
export function TitleCombobox({
  value,
  onChange,
  className,
  onBlur,
  ...inputProps
}: Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange' | 'ref'> & {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1); // -1 = belum ada highlight
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const options = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return [...TITLE_PRESETS];
    // Judul kustom (tidak cocok preset apa pun) → daftar kosong, tidak dirender.
    return TITLE_PRESETS.filter((p) => p.toLowerCase().includes(q));
  }, [value]);

  const show = open && options.length > 0;

  const close = () => {
    setOpen(false);
    setActive(-1);
  };

  const commit = (preset: string) => {
    onChange(preset);
    close();
    // fokus balik ke input dengan caret di akhir supaya judul bisa dilanjutkan
    const el = inputRef.current;
    if (el) {
      el.focus();
      requestAnimationFrame(() => el.setSelectionRange(preset.length, preset.length));
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (options.length === 0) return;
      e.preventDefault();
      if (!show) {
        setOpen(true);
        setActive(e.key === 'ArrowDown' ? 0 : options.length - 1);
        return;
      }
      setActive(
        e.key === 'ArrowDown'
          ? (active + 1) % options.length
          : (active <= 0 ? options.length : active) - 1,
      );
      return;
    }
    if (e.key === 'Enter' && show && active >= 0) {
      e.preventDefault(); // pilih saran, jangan submit form
      commit(options[active]!);
      return;
    }
    if (e.key === 'Escape' && open) {
      e.stopPropagation(); // tutup daftar saja, jangan tutup Dialog
      close();
    }
  };

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        role="combobox"
        aria-expanded={show}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={show && active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        value={value}
        className={cn('pr-9', className)}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onClick={() => setOpen(true)}
        onBlur={(e) => {
          close();
          onBlur?.(e);
        }}
        onKeyDown={onKeyDown}
        {...inputProps}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label="Tampilkan pilihan judul"
        // mousedown, bukan click: hindari blur-lalu-buka yang bikin daftar berkedip
        onMouseDown={(e) => {
          e.preventDefault();
          setOpen((o) => !o);
          inputRef.current?.focus();
        }}
        className="absolute top-1/2 right-1 -translate-y-1/2 rounded-sm p-1.5 text-muted-foreground hover:text-foreground"
      >
        <ChevronDown className={cn('size-4 transition-transform', show && 'rotate-180')} />
      </button>

      {show && (
        <div className="absolute top-full right-0 left-0 z-50 mt-1 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md">
          <ul
            id={listId}
            role="listbox"
            aria-label="Pilihan judul"
            className="max-h-56 overflow-y-auto overscroll-contain p-1"
          >
            {options.map((preset, i) => (
              <li key={preset}>
                <button
                  type="button"
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={value === preset}
                  onMouseDown={(e) => e.preventDefault()} // jangan blur input
                  onMouseEnter={() => setActive(i)}
                  onClick={() => commit(preset)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm',
                    i === active ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60',
                  )}
                >
                  <Check
                    aria-hidden
                    className={cn(
                      'size-4 shrink-0',
                      value === preset ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <span className="truncate">{preset}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="border-t px-3 py-2 text-xs text-muted-foreground">
            Ketik bebas untuk judul kustom.
          </p>
        </div>
      )}
    </div>
  );
}
