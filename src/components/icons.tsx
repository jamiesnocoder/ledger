type IconProps = { className?: string; size?: number };

function Svg({ children, className, size = 20 }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const Icon = {
  sun: (p: IconProps) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </Svg>
  ),
  moon: (p: IconProps) => (
    <Svg {...p}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </Svg>
  ),
  settings: (p: IconProps) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </Svg>
  ),
  chevronLeft: (p: IconProps) => (
    <Svg {...p}>
      <polyline points="15 18 9 12 15 6" />
    </Svg>
  ),
  chevronDown: (p: IconProps) => (
    <Svg {...p}>
      <polyline points="6 9 12 15 18 9" />
    </Svg>
  ),
  close: (p: IconProps) => (
    <Svg {...p}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </Svg>
  ),
  plus: (p: IconProps) => (
    <Svg {...p}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </Svg>
  ),
  trash: (p: IconProps) => (
    <Svg {...p}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </Svg>
  ),
  check: (p: IconProps) => (
    <Svg {...p}>
      <polyline points="20 6 9 17 4 12" />
    </Svg>
  ),
  backspace: (p: IconProps) => (
    <Svg {...p}>
      <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
      <line x1="18" y1="9" x2="12" y2="15" />
      <line x1="12" y1="9" x2="18" y2="15" />
    </Svg>
  ),
  cash: (p: IconProps) => (
    <Svg {...p}>
      <rect x="2" y="6" width="20" height="12" rx="2.5" />
      <circle cx="12" cy="12" r="3" />
      <path d="M6 12h.01M18 12h.01" />
    </Svg>
  ),
  gift: (p: IconProps) => (
    <Svg {...p}>
      <polyline points="20 12 20 22 4 22 4 12" />
      <rect x="2" y="7" width="20" height="5" rx="1" />
      <line x1="12" y1="22" x2="12" y2="7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </Svg>
  ),
  trade: (p: IconProps) => (
    <Svg {...p}>
      <path d="M5 21V10M12 21V4M19 21v-7" />
      <path d="M2 10h6M9 4h6M16 14h6" />
    </Svg>
  ),
  invest: (p: IconProps) => (
    <Svg {...p}>
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </Svg>
  ),
  transfer: (p: IconProps) => (
    <Svg {...p}>
      <path d="M4 10h14l-3.5-3.5" />
      <path d="M20 15H6l3.5 3.5" />
    </Svg>
  ),
  food: (p: IconProps) => (
    <Svg {...p}>
      <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
      <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4z" />
      <line x1="6" y1="1" x2="6" y2="4" />
      <line x1="10" y1="1" x2="10" y2="4" />
      <line x1="14" y1="1" x2="14" y2="4" />
    </Svg>
  ),
  bag: (p: IconProps) => (
    <Svg {...p}>
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </Svg>
  ),
  plane: (p: IconProps) => (
    <Svg {...p}>
      <path d="M17.8 19.8 16 11l3.5-3.5c.7-.7.7-2.1 0-2.8-.7-.7-2.1-.7-2.8 0L13.2 8.2 4.4 6.4c-.4-.1-.8.1-.9.5s0 .8.4 1l6.6 4.4-2.9 2.9-3-.3-1.1 1.1 3.9 1.9 1.9 3.9 1.1-1.1-.3-3 2.9-2.9 4.4 6.6c.2.4.6.5 1 .4s.6-.5.5-.9z" />
    </Svg>
  ),
  wrench: (p: IconProps) => (
    <Svg {...p}>
      <path d="M14.7 6.3a4 4 0 0 0-5.6 4.9L3 17.4V21h3.6l6.1-6.1a4 4 0 0 0 4.9-5.6l-2.8 2.8-2-2z" />
    </Svg>
  ),
  film: (p: IconProps) => (
    <Svg {...p}>
      <rect x="2" y="3" width="20" height="18" rx="2" />
      <line x1="7" y1="3" x2="7" y2="21" />
      <line x1="17" y1="3" x2="17" y2="21" />
      <line x1="2" y1="9" x2="7" y2="9" />
      <line x1="2" y1="15" x2="7" y2="15" />
      <line x1="17" y1="9" x2="22" y2="9" />
      <line x1="17" y1="15" x2="22" y2="15" />
    </Svg>
  ),
  heart: (p: IconProps) => (
    <Svg {...p}>
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z" />
    </Svg>
  ),
  tag: (p: IconProps) => (
    <Svg {...p}>
      <path d="M20.6 12.9 12.9 20.6a2 2 0 0 1-2.8 0l-8-8A2 2 0 0 1 2 11.2V4a2 2 0 0 1 2-2h7.2a2 2 0 0 1 1.4.6l8 8a2 2 0 0 1 0 2.8z" />
      <circle cx="7" cy="7" r="1.4" />
    </Svg>
  ),
  toggleView: (p: IconProps) => (
    <Svg {...p}>
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </Svg>
  ),
  wallet: (p: IconProps) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" strokeDasharray="2 4.2" />
      <path d="M8 12h5m3 0h.01" />
    </Svg>
  ),
};

export const CATEGORY_ICON_KEYS = ["food", "bag", "plane", "wrench", "film", "heart", "tag"] as const;
