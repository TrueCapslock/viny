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
    <svg className={className} viewBox="0 0 576 512" width={18} height={16} fill="currentColor">
      <path d="M259.3 17.8L194 150.2 47.9 171.5c-26.2 3.8-36.7 36.1-17.7 54.6l105.7 103-25 145.5c-4.5 26.3 23.2 46 46.4 33.7L288 439.6l130.7 68.7c23.2 12.2 50.9-7.4 46.4-33.7l-25-145.5 105.7-103c19-18.5 8.5-50.8-17.7-54.6L382 150.2 316.7 17.8c-11.7-23.6-45.6-23.9-57.4 0z" />
    </svg>
  )
}

export function Plus({ className }: { className?: string }) {
  return <Icon name="add_circle" size={24} className={className} />
}

export function Lists({ className }: { className?: string }) {
  return <Icon name="bookmarks" size={24} className={className} />
}

export function PlaylistAdd({ className }: { className?: string }) {
  return <Icon name="playlist_add" size={24} className={className} />
}
