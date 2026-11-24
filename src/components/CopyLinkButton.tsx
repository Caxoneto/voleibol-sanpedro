'use client';

import { useState } from 'react';
import { Check, Link2 } from 'lucide-react';

interface CopyLinkButtonProps {
  url: string;
  className?: string;
}

export default function CopyLinkButton({ url, className = '' }: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else if (typeof document !== 'undefined') {
        const temp = document.createElement('textarea');
        temp.value = url;
        temp.setAttribute('readonly', '');
        temp.style.position = 'fixed';
        temp.style.opacity = '0';
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      aria-live="polite"
      className={`px-3.5 py-2 bg-surface-container-high hover:bg-surface-bright text-on-surface font-label-md text-label-md uppercase flex items-center gap-1.5 transition-all border border-white/15 shadow-[2px_2px_0px_0px_#0e0e0e] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer ${className}`}
    >
      {copied ? (
        <Check className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
      ) : (
        <Link2 className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
      )}
      <span>{copied ? '¡Copiado!' : 'Copiar Enlace'}</span>
    </button>
  );
}
