/**
 * Le hace descargar al navegador un archivo que llegó como Blob (PDF de una
 * observación, un adjunto) — no hay <a href> real porque el archivo nunca
 * tuvo una URL pública, solo bytes que trajo una llamada autenticada.
 */
export function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
