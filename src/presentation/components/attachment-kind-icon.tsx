import type { AttachmentKind } from '../../domain/rules/patient-attachment.rules';
import { CameraIcon, DocIcon, VideoIcon } from './icons';

/** El ícono según el tipo de adjunto — compartido por el panel de la ficha y el pase de consulta. */
export function AttachmentKindIcon({
  kind,
}: Readonly<{ kind: AttachmentKind }>) {
  if (kind === 'image') return <CameraIcon />;
  if (kind === 'video') return <VideoIcon />;
  return <DocIcon />;
}
