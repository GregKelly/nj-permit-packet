'use client';
// A submit button that says what's happening while the server works (the AI calls take several seconds).

import { useFormStatus } from 'react-dom';

export function Submit({ children, pending, className, name, value }: { children: React.ReactNode; pending?: string; className?: string; name?: string; value?: string }) {
  const { pending: busy } = useFormStatus();
  return (
    <button type="submit" disabled={busy} className={className} name={name} value={value}>
      {busy ? pending ?? 'Working…' : children}
    </button>
  );
}
