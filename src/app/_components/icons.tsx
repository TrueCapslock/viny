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
  return (
    <span
      className={`material-symbols-outlined leading-none ${filled ? "fill-1" : ""} ${className ?? ""}`}
      style={{ fontSize: 18 }}
    >
      star
    </span>
  )
}

export function Plus({ className }: { className?: string }) {
  return <Icon name="add_circle" size={24} className={className} />
}
