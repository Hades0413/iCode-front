import { SearchIcon } from '../icons';

/** Buscador de una lista. Suelto para poder acomodarlo con otros controles. */
export function SearchInput({
  value,
  onChange,
  placeholder,
  label,
  inputMode,
  maxLength,
}: Readonly<{
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  /** "numeric" abre el teclado de números en móvil (buscar por DNI). */
  inputMode?: 'text' | 'numeric';
  maxLength?: number;
}>) {
  return (
    <label className="search">
      <SearchIcon />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        inputMode={inputMode}
        maxLength={maxLength}
      />
    </label>
  );
}
