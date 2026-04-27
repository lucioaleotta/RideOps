import { ReactNode } from 'react';

type StatusNoticeTone = 'info' | 'warning' | 'error' | 'success';

type StatusNoticeProps = {
  tone: StatusNoticeTone;
  title?: string;
  children: ReactNode;
  className?: string;
};

function toneRole(tone: StatusNoticeTone) {
  if (tone === 'error') {
    return { role: 'alert' as const, live: 'assertive' as const };
  }
  return { role: 'status' as const, live: 'polite' as const };
}

function toneTitle(tone: StatusNoticeTone) {
  if (tone === 'error') return 'Errore';
  if (tone === 'warning') return 'Attenzione';
  if (tone === 'success') return 'Successo';
  return 'Informazione';
}

function StatusNoticeIcon({ tone }: { tone: StatusNoticeTone }) {
  if (tone === 'warning') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 3.2 2.8 20h18.4L12 3.2Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M12 8.7v5.9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="12" cy="17.2" r="1" fill="currentColor" />
      </svg>
    );
  }

  if (tone === 'error') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="m9.2 9.2 5.6 5.6M14.8 9.2l-5.6 5.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (tone === 'success') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="m8 12.4 2.6 2.8 5.4-5.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 10.2v6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="7.3" r="1" fill="currentColor" />
    </svg>
  );
}

export function StatusNotice({ tone, title, children, className }: StatusNoticeProps) {
  const semantics = toneRole(tone);
  const resolvedTitle = title ?? toneTitle(tone);
  const classes = ['services-notice', `services-notice--${tone}`, className].filter(Boolean).join(' ');

  return (
    <div className={classes} role={semantics.role} aria-live={semantics.live}>
      <span className="services-notice-icon" aria-hidden="true"><StatusNoticeIcon tone={tone} /></span>
      <div className="services-notice-text">
        <strong className="services-notice-title">{resolvedTitle}</strong>
        <span>{children}</span>
      </div>
    </div>
  );
}
