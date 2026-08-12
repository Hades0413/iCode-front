import type { Toast } from '../hooks/use-toasts';
import { CheckIcon, WarnIcon } from './icons';

export function Toasts({ toasts }: Readonly<{ toasts: readonly Toast[] }>) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast ${toast.tone === 'err' ? 't-err' : ''}`}
        >
          <span className="tmk">
            {toast.tone === 'err' ? <WarnIcon /> : <CheckIcon />}
          </span>
          <div>
            <div className="tt">{toast.title}</div>
            {toast.detail && <div className="td">{toast.detail}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
