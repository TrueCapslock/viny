export function Icon({ name, size = 24, className }: { name: string; size?: number; className?: string }) {
  return (
    <span
      className={`material-symbols-outlined leading-none ${className ?? ""}`}
      style={{ fontSize: size, fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
    >
      {name}
    </span>
  )
}

export function WineGlass({ className }: { className?: string }) {
  return <Icon name="wine_bar" size={24} className={className} />
}

export function Grape({ className }: { className?: string }) {
  return <Icon name="grapes" size={24} className={className} />
}

export function WineBottle({ className }: { className?: string }) {
  return <Icon name="liquor" size={24} className={className} />
}

export function Corkscrew({ className }: { className?: string }) {
  return <Icon name="person" size={24} className={className} />
}

export function Shelf({ className }: { className?: string }) {
  return <Icon name="shelves" size={24} className={className} />
}

export function Users({ className }: { className?: string }) {
  return <Icon name="group" size={22} className={className} />
}

export function Star({ className, filled }: { className?: string; filled?: boolean }) {
  return filled ? (
    <svg className={className} viewBox="0 0 24 24" width={18} height={18} fill="currentColor">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ) : (
    <svg className={className} viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  )
}

export function Plus({ className }: { className?: string }) {
  return <Icon name="add_circle" size={24} className={className} />
}
