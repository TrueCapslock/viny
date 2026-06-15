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
    <svg className={className} viewBox="0 0 60 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="25" y="0" width="10" height="30" rx="2" fill="currentColor" opacity="0.4" />
      <path d="M20 30h20l5 15c1 3-1 6-4 6H19c-3 0-5-3-4-6l5-15z" fill="currentColor" opacity="0.3" />
      <path d="M22 55c0-5 16-5 16 0" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.3" />
      <path d="M20 65c0-8 20-8 20 0" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.25" />
      <path d="M18 75c0-10 24-10 24 0" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.2" />
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
