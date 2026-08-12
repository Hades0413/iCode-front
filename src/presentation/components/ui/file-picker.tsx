import { useId, useRef, useState } from 'react';
import { formatFileSize } from '../../../common/utils/format-file-size';

/**
 * Elegir un archivo del disco.
 *
 * El `<input type="file">` nativo se esconde y el que se ve es un botón del
 * sistema de diseño: el control del navegador no se puede estilar y encima
 * dice "Sin archivos seleccionados" en el idioma del sistema, que en una
 * pantalla en castellano salta a la vista. Lo que no se toca es el input real — sigue
 * siendo el que abre el diálogo, así que el teclado y los lectores de
 * pantalla funcionan como siempre.
 */
export function FilePicker({
  label,
  accept,
  hint,
  file,
  onSelect,
  disabled = false,
}: Readonly<{
  /** El texto del botón: "Elegir la carta". */
  label: string;
  /** Extensiones aceptadas, para el diálogo: ".pdf,.doc,.docx". */
  accept: string;
  /** Qué se espera, dicho abajo: "PDF o Word, hasta 10 MB". */
  hint?: string;
  /** El archivo elegido, o null. */
  file: File | null;
  onSelect: (file: File | null) => void;
  disabled?: boolean;
}>) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  function select(next: File | null) {
    onSelect(next);
    // Sin esto, elegir el mismo archivo dos veces seguidas no dispara change:
    // el input recuerda el valor anterior y la segunda vez no pasa nada.
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }

  return (
    <div
      className={`filepick ${isDragging ? 'over' : ''} ${disabled ? 'off' : ''}`}
      onDragOver={(event) => {
        if (disabled) return;
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        if (disabled) return;
        event.preventDefault();
        setIsDragging(false);
        select(event.dataTransfer.files.item(0));
      }}
    >
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        className="filepick-in"
        accept={accept}
        disabled={disabled}
        onChange={(event) => select(event.target.files?.item(0) ?? null)}
      />
      <label htmlFor={inputId} className="btn">
        {label}
      </label>
      <div className="filepick-t">
        {file ? (
          <>
            <b>{file.name}</b>
            <span className="mini"> · {formatFileSize(file.size)}</span>
          </>
        ) : (
          <span className="mini">{hint ?? 'Ningún archivo elegido'}</span>
        )}
      </div>
      {file && !disabled && (
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => select(null)}
        >
          Quitar
        </button>
      )}
    </div>
  );
}
