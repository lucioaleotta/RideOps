import { ReactNode } from 'react';

export function ButtonContent({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <>
      <span className="button-icon" aria-hidden="true">{icon}</span>
      <span className="button-label">{children}</span>
    </>
  );
}

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

export function EditIcon() {
  return <Svg><path d="m5 16.8 9.9-9.9 3.2 3.2-9.9 9.9L5 20Z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" /><path d="m13.8 8 3.2 3.2" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /></Svg>;
}

export function DeleteIcon() {
  return <Svg><path d="M5.8 7.4h12.4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /><path d="M9.4 7.4V5.7h5.2v1.7" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" /><path d="M8 7.4l.8 10.1h6.4L16 7.4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" /><path d="M10.5 10.2v4.8M13.5 10.2v4.8" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /></Svg>;
}

export function LockIcon() {
  return <Svg><rect x="6.3" y="10.6" width="11.4" height="8.2" rx="1.7" fill="none" stroke="currentColor" strokeWidth="1.9" /><path d="M8.8 10.6V8.5A3.2 3.2 0 0 1 12 5.3a3.2 3.2 0 0 1 3.2 3.2v2.1" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /></Svg>;
}

export function PartnerIcon() {
  return <Svg><path d="m7 12.4 3.2 2.8a2 2 0 0 0 2.7-.1l4.3-4.1" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /><path d="m3.8 11.3 2.6-2.5a2 2 0 0 1 2.7 0l2 1.8" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /><path d="m20.2 11.3-2.6-2.5a2 2 0 0 0-2.7 0l-2 1.8" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /><path d="m7.1 14.8-1.8 1.8m3 1.1-1.6 1.6m3-.3-1.5 1.5m3.1-1.2-1.3 1.3" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /></Svg>;
}

export function PrintIcon() {
  return <Svg><path d="M7.1 9.4V5.7h9.8v3.7" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" /><rect x="6.1" y="13" width="11.8" height="5.4" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.9" /><rect x="4.8" y="9.4" width="14.4" height="5.3" rx="1.4" fill="none" stroke="currentColor" strokeWidth="1.9" /></Svg>;
}

export function CursorIcon() {
  return <Svg><path d="m6 5 10 7-4 1.2L13.6 19 11 20l-1.6-5.8L6 5Z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" /></Svg>;
}

export function SaveIcon() {
  return <Svg><path d="M6 5.8h10.2l1.8 1.8v10.6A1.8 1.8 0 0 1 16.2 20H7.8A1.8 1.8 0 0 1 6 18.2Z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" /><path d="M9 5.8v4.6h5.2V5.8M9.2 16h5.6" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

export function CancelIcon() {
  return <Svg><path d="m7 7 10 10M17 7 7 17" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /></Svg>;
}

export function ResetIcon() {
  return <Svg><path d="M7.4 8.1H4.8v2.6" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /><path d="M5 10.7a7 7 0 1 0 2.2-4.6" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

export function FilterIcon() {
  return <Svg><path d="M5.5 7h13l-5.1 5.7v4.8l-2.8-1.5v-3.3Z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" /></Svg>;
}

export function SearchIcon() {
  return <Svg><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.9" /><line x1="16" y1="16" x2="21" y2="21" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /></Svg>;
}

export function LoginIcon() {
  return <Svg><path d="M10 7V5.8A1.8 1.8 0 0 1 11.8 4h6.4A1.8 1.8 0 0 1 20 5.8v12.4a1.8 1.8 0 0 1-1.8 1.8h-6.4A1.8 1.8 0 0 1 10 18.2V17" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /><path d="M4 12h10m-3.2-3.2L14 12l-3.2 3.2" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

export function OpenIcon() {
  return <Svg><path d="M14 5.5h4.5V10" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /><path d="M10 14 18.5 5.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /><path d="M18 13.5v4A1.5 1.5 0 0 1 16.5 19h-10A1.5 1.5 0 0 1 5 17.5v-10A1.5 1.5 0 0 1 6.5 6h4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

export function SelectIcon() {
  return <Svg><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.9" /><path d="m8.7 12 2.2 2.2 4.4-4.4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

export function AddIcon() {
  return <Svg><path d="M12 5.5v13M5.5 12h13" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /></Svg>;
}

export function UserIcon() {
  return <Svg><circle cx="12" cy="8.3" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.9" /><path d="M5.7 18.5c1.4-3.1 3.9-4.7 6.3-4.7s5 1.6 6.3 4.7" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /></Svg>;
}

export function CalendarIcon() {
  return <Svg><rect x="5.2" y="6.2" width="13.6" height="12.6" rx="1.6" fill="none" stroke="currentColor" strokeWidth="1.9" /><path d="M8.4 4.8v2.8M15.6 4.8v2.8M5.2 9.4h13.6" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /></Svg>;
}

export function ArrowLeftIcon() {
  return <Svg><path d="M18 12H6m0 0 4.2-4.2M6 12l4.2 4.2" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

export function ArrowRightIcon() {
  return <Svg><path d="M6 12h12m0 0-4.2-4.2M18 12l-4.2 4.2" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

export function TodayIcon() {
  return <Svg><rect x="5.2" y="6.2" width="13.6" height="12.6" rx="1.6" fill="none" stroke="currentColor" strokeWidth="1.9" /><path d="M8.4 4.8v2.8M15.6 4.8v2.8M5.2 9.4h13.6M12 13h.01" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /></Svg>;
}

export function JournalIcon() {
  return <Svg><path d="M7 5.5h10a1.5 1.5 0 0 1 1.5 1.5v10A1.5 1.5 0 0 1 17 18.5H7A1.5 1.5 0 0 1 5.5 17V7A1.5 1.5 0 0 1 7 5.5Z" fill="none" stroke="currentColor" strokeWidth="1.9" /><path d="M9 9.2h6M9 12h6M9 14.8h4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /></Svg>;
}