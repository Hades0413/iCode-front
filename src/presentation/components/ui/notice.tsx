import type { ReactNode } from 'react';
import { CheckIcon, InfoIcon, LockIcon, WarnIcon } from '../icons';

export type NoticeTone = 'info' | 'ok' | 'warn' | 'crit' | 'locked';

const ICON: Record<NoticeTone, () => ReactNode> = {
  info: InfoIcon,
  ok: CheckIcon,
  warn: WarnIcon,
  crit: WarnIcon,
  locked: LockIcon,
};

const CLASS: Record<NoticeTone, string> = {
  info: 'notice',
  ok: 'notice n-ok',
  warn: 'notice n-warn',
  crit: 'warnrow',
  locked: 'notice',
};

/**
 * Un aviso en línea: explica algo o advierte. Su tono dice qué tan mal está
 * la cosa, y el icono va solo — no hay que acordarse de emparejarlos en cada
 * pantalla.
 */
export function Notice({
  tone = 'info',
  children,
  className = '',
}: Readonly<{
  tone?: NoticeTone;
  children: ReactNode;
  className?: string;
}>) {
  const Icon = ICON[tone];
  return (
    <div className={`${CLASS[tone]} ${className}`.trim()}>
      <Icon />
      <div>{children}</div>
    </div>
  );
}
