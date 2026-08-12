/**
 * "1,2 MB" — el tamaño de un archivo como lo lee una persona.
 *
 * Vive en common/ y no al lado del selector de archivos porque lo usan los
 * dos lados de la carta: el que la sube y el que la ve ya enviada.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}
