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

export function Star({ className }: { className?: string; filled?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 576 512" width={18} height={16} fill="currentColor">
      <path d="M259.3 17.8L194 150.2 47.9 171.5c-26.2 3.8-36.7 36.1-17.7 54.6l105.7 103-25 145.5c-4.5 26.3 23.2 46 46.4 33.7L288 439.6l130.7 68.7c23.2 12.2 50.9-7.4 46.4-33.7l-25-145.5 105.7-103c19-18.5 8.5-50.8-17.7-54.6L382 150.2 316.7 17.8c-11.7-23.6-45.6-23.9-57.4 0z" />
    </svg>
  )
}

// iOS-style share glyph: an upward-pointing arrow rising out of an
// open-top rounded tray. Two separate filled paths so the arrow and the
// tray can each be `currentColor`-stained; matches SF Symbols `square.and.arrow.up`
// / Material Symbols `ios_share`. Deliberately NOT routed through the
// `Icon` Material-Symbols text-glyph bridge because we want a real SVG
// (CSS color + crisp pixel rendering at any density).
export function Share({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      {/* Solid upward arrow (tip at 12,2, shaft x∈[10.5,13.5], bottom y=15) */}
      <path d="M12 2L8 6h2.5v9h3V6H16l-4-4z" />
      {/* Open-top rounded tray (U-shape via outer + inner rounded rectangle) */}
      <path d="M5 13v6.5C5 20.88 6.12 22 7.5 22h9c1.38 0 2.5-1.12 2.5-2.5V13h-2v6.5c0 .28-.22.5-.5.5h-9c-.28 0-.5-.22-.5-.5V13H5z" />
    </svg>
  )
}

// Filled calendar glyph (two binding posts + body with a square hint slot).
// Matches the fill-style aesthetic of Star and Share so a small icon row
// feels visually consistent.
export function Calendar({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v16c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H5V9h14v12zM7 11h5v5H7v-5z" />
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
