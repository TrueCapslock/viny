export function WineGlass({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 10h60l-15 55c-3 10-10 15-15 15s-12-5-15-15L20 10z" fill="currentColor" opacity="0.3" />
      <path d="M25 10h50l-12 50c-3 10-10 15-13 15s-10-5-13-15L25 10z" fill="currentColor" opacity="0.5" />
      <rect x="45" y="80" width="10" height="15" rx="2" fill="currentColor" opacity="0.4" />
      <rect x="30" y="95" width="40" height="5" rx="2.5" fill="currentColor" opacity="0.3" />
      <ellipse cx="50" cy="85" rx="20" ry="4" fill="currentColor" opacity="0.15" />
    </svg>
  )
}

export function Grape({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="40" cy="25" rx="20" ry="8" fill="currentColor" opacity="0.15" />
      <line x1="40" y1="25" x2="40" y2="42" stroke="currentColor" strokeWidth="2" opacity="0.3" />
      <line x1="35" y1="28" x2="25" y2="20" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
      <line x1="45" y1="28" x2="55" y2="20" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
      <circle cx="40" cy="50" r="8" fill="currentColor" opacity="0.4" />
      <circle cx="32" cy="55" r="7" fill="currentColor" opacity="0.35" />
      <circle cx="48" cy="55" r="7" fill="currentColor" opacity="0.35" />
      <circle cx="36" cy="63" r="6" fill="currentColor" opacity="0.3" />
      <circle cx="44" cy="63" r="6" fill="currentColor" opacity="0.3" />
      <circle cx="40" cy="70" r="5" fill="currentColor" opacity="0.25" />
    </svg>
  )
}

export function WineBottle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 60 140" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="0" width="20" height="25" rx="3" fill="currentColor" opacity="0.3" />
      <rect x="18" y="20" width="24" height="8" rx="2" fill="currentColor" opacity="0.4" />
      <path d="M15 28h30l-3 90c-1 8-7 14-12 14s-11-6-12-14L15 28z" fill="currentColor" opacity="0.5" />
      <rect x="25" y="40" width="10" height="15" rx="1" fill="currentColor" opacity="0.2" />
    </svg>
  )
}

export function Corkscrew({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="7" r="4" fill="currentColor" opacity="0.35" />
      <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 21c0-4 3-8 8-8s8 4 8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
    </svg>
  )
}

export function Plus({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.35" />
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 12h8M12 8v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Stars({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 30" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="1.5" fill="currentColor" opacity="0.4" />
      <circle cx="30" cy="5" r="1" fill="currentColor" opacity="0.3" />
      <circle cx="55" cy="12" r="2" fill="currentColor" opacity="0.5" />
      <circle cx="80" cy="8" r="1.5" fill="currentColor" opacity="0.35" />
      <circle cx="100" cy="15" r="1" fill="currentColor" opacity="0.25" />
      <circle cx="120" cy="6" r="2" fill="currentColor" opacity="0.45" />
      <circle cx="145" cy="14" r="1.5" fill="currentColor" opacity="0.3" />
      <circle cx="170" cy="9" r="1" fill="currentColor" opacity="0.4" />
      <circle cx="190" cy="13" r="1.5" fill="currentColor" opacity="0.35" />
    </svg>
  )
}

export function Star({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.33L10 13.13l-4.77 2.59.91-5.33L2.27 6.62l5.34-.78L10 1z" />
    </svg>
  )
}

export function Shelf({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="3" width="20" height="2" rx="1" fill="currentColor" opacity="0.3" />
      <rect x="2" y="12" width="20" height="2" rx="1" fill="currentColor" opacity="0.35" />
      <rect x="2" y="19" width="20" height="2" rx="1" fill="currentColor" opacity="0.3" />
      <rect x="5" y="5" width="3" height="7" rx="0.75" fill="currentColor" opacity="0.5" />
      <rect x="10" y="5" width="3" height="7" rx="0.75" fill="currentColor" opacity="0.35" />
      <rect x="16" y="5" width="3" height="7" rx="0.75" fill="currentColor" opacity="0.45" />
      <rect x="7" y="14" width="3" height="5" rx="0.75" fill="currentColor" opacity="0.4" />
      <rect x="14" y="14" width="3" height="5" rx="0.75" fill="currentColor" opacity="0.55" />
    </svg>
  )
}

export function Users({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="6" r="3" fill="currentColor" opacity="0.35" />
      <circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="17" cy="7" r="2.5" fill="currentColor" opacity="0.35" />
      <circle cx="17" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 20c0-3.5 2.5-6 5-6s5 2.5 5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
      <path d="M13 19c0-2.8 2-5 4.5-5s4.5 2.2 4.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.45" />
    </svg>
  )
}
