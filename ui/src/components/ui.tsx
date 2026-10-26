import { useState, type ReactNode } from 'react';

const ICONS: Record<string, ReactNode> = {
  traffic: <><path d="M3 5h10M3 8h7M3 11h9" /></>,
  android: <><rect x="4.5" y="1.8" width="7" height="12.4" rx="1.6" /><path d="M7 12.2h2" /></>,
  settings: <><circle cx="8" cy="8" r="2" /><path d="M8 1.8v1.6M8 12.6v1.6M1.8 8h1.6M12.6 8h1.6M3.6 3.6l1.1 1.1M11.3 11.3l1.1 1.1M3.6 12.4l1.1-1.1M11.3 4.7l1.1-1.1" /></>,
  search: <><circle cx="7" cy="7" r="4.2" /><path d="M10.2 10.2L14 14" /></>,
  trash: <><path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5M7 7v3.5M9 7v3.5" /></>,
  pause: <><path d="M5.5 3.5v9M10.5 3.5v9" /></>,
  play: <><path d="M5 3.5l7 4.5-7 4.5z" /></>,
  download: <><path d="M8 2.5v8M4.8 7.6L8 10.8l3.2-3.2M3 13.2h10" /></>,
  copy: <><rect x="5.2" y="5.2" width="8" height="8" rx="1.6" /><path d="M10.8 5.2V4a1.6 1.6 0 0 0-1.6-1.6H4A1.6 1.6 0 0 0 2.4 4v5.2A1.6 1.6 0 0 0 4 10.8h1.2" /></>,
  pin: <><path d="M9.5 2.5l4 4-2 .8-2.2 2.2.4 2.8-1 1-2.6-2.6-3.4 3.4M6.4 5.3l.8-2 2.3-.8" /></>,
  chevron: <><path d="M4.5 6.5L8 10l3.5-3.5" /></>,
  close: <><path d="M4 4l8 8M12 4l-8 8" /></>,
  warn: <><path d="M8 2.5l6 10.5H2z" /><path d="M8 6.8v3M8 11.5v.1" /></>,
  lock: <><rect x="3.5" y="7" width="9" height="6.5" rx="1.6" /><path d="M5.5 7V5.2a2.5 2.5 0 0 1 5 0V7" /></>,
  bolt: <><path d="M9 1.8L3.5 9H8l-1 5.2L12.5 7H8z" /></>,
  ws: <><path d="M2.5 5.5h8l-2-2M13.5 10.5h-8l2 2" /></>,
  tcp: <><circle cx="4" cy="8" r="1.6" /><circle cx="12" cy="8" r="1.6" /><path d="M5.6 8h4.8" /></>,
  refresh: <><path d="M13 8a5 5 0 1 1-1.6-3.7M13 2.5v3h-3" /></>,
  check: <><path d="M3.5 8.5l3 3 6-7" /></>,
  usb: <><path d="M8 13.5V4M8 4l-1.6 1.6M8 4l1.6 1.6M8 9.5L5 7.5v-1M8 8l3-2v-1" /><circle cx="5" cy="5.6" r=".9" /></>,
  export: <><path d="M8 10V2.5M5.2 5.2L8 2.5l2.8 2.7M3 9.5v3.2h10V9.5" /></>,
  terminal: <><path d="M3 4.5l3.5 3.5L3 11.5M8 12h5" /></>,
};

export function Icon({ name, size = 16 }: { name: keyof typeof ICONS | string; size?: number }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor"
      strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {ICONS[name]}
    </svg>
  );
}

export function Spinner() { return <span className="spinner" />; }

export function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} disabled={disabled}
      className={'toggle' + (on ? ' on' : '')} onClick={() => onChange(!on)} />
  );
}

export function Seg<T extends string>({ value, options, onChange }: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void;
}) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={o.value} type="button" className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Section({ title, right, children, defaultOpen = true }: {
  title: ReactNode; right?: ReactNode; children: ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={'section' + (open ? '' : ' closed')}>
      <div className="section-head" onClick={() => setOpen(!open)}>
        <span className="chev"><Icon name="chevron" size={14} /></span>
        <span>{title}</span>
        <span className="spacer" />
        <span onClick={(e) => e.stopPropagation()} className="row">{right}</span>
      </div>
      <div className="section-body">{children}</div>
    </div>
  );
}

export function Empty({ icon, title, children }: { icon: string; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <div className="big"><Icon name={icon} size={26} /></div>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
    </div>
  );
}
