'use client';

import { useId, useState, type InputHTMLAttributes } from 'react';
import { useTranslation } from '../lib/i18n/LanguageContext';

/** La visibilité reste locale au champ et le mot de passe est masqué à chaque ouverture. */
export function PasswordInput({ id, className = '', disabled, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [visible, setVisible] = useState(false);
  const { t } = useTranslation();
  const toggleLabel = t(visible ? 'common.hidePassword' : 'common.showPassword');

  return (
    <span dir={props.dir} className="relative block w-full">
      <input {...props} id={inputId} disabled={disabled} type={visible ? 'text' : 'password'} className={`${className} w-full pe-12`} />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        disabled={disabled}
        aria-label={toggleLabel}
        aria-controls={inputId}
        title={toggleLabel}
        className="absolute inset-y-0 end-0 flex w-11 items-center justify-center rounded-xl text-neutral-500 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
          {visible && <path d="m3 3 18 18" />}
        </svg>
      </button>
    </span>
  );
}
