"use client"

import { useState, useRef, useEffect } from "react"

export function AvatarCropDialog({
  imageUrl,
  onCrop,
  onClose,
}: {
  imageUrl: string
  onCrop: (croppedBlob: Blob) => void
  onClose: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const [zoom, setZoom] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [imageLoaded, setImageLoaded] = useState(false)
  const [cropSize, setCropSize] = useState(0)
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, origX: 0, origY: 0 })
  const [naturalSize, setNaturalSize] = useState({ w: 1, h: 1 })
  const naturalRef = useRef({ w: 1, h: 1 })

  useEffect(() => {
    function updateSize() {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth
        setCropSize(Math.min(w - 48, 320))
      }
    }
    updateSize()
    window.addEventListener("resize", updateSize)
    return () => window.removeEventListener("resize", updateSize)
  }, [])

  function clamp(x: number, y: number) {
    const aspect = naturalRef.current.w / naturalRef.current.h
    const cs = cropSize || 280
    const imgW = aspect >= 1 ? cs * zoom * aspect : cs * zoom
    const imgH = aspect >= 1 ? cs * zoom : cs * zoom / aspect
    const maxX = Math.max(0, (imgW - cs) / 2)
    const maxY = Math.max(0, (imgH - cs) / 2)
    return {
      x: Math.min(maxX, Math.max(-maxX, x)),
      y: Math.min(maxY, Math.max(-maxY, y)),
    }
  }

  function onPointerDown(e: React.PointerEvent) {
    const d = dragRef.current
    d.dragging = true
    d.startX = e.clientX
    d.startY = e.clientY
    d.origX = position.x
    d.origY = position.y
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = dragRef.current
    if (!d.dragging) return
    const next = clamp(
      d.origX + (e.clientX - d.startX),
      d.origY + (e.clientY - d.startY),
    )
    setPosition(next)
  }

  function onPointerUp(e: React.PointerEvent) {
    const d = dragRef.current
    if (!d.dragging) return
    d.dragging = false
    e.currentTarget.releasePointerCapture(e.pointerId)
  }

  function getDisplaySize(cs: number, z: number) {
    const aspect = naturalSize.w / naturalSize.h
    if (aspect >= 1) {
      const h = cs * z
      return { w: h * aspect, h }
    }
    const w = cs * z
    return { w, h: w / aspect }
  }

  function doCrop() {
    const img = imageRef.current
    if (!img || !imageLoaded) return

    const cs = cropSize || 280
    const { w: imgW, h: imgH } = getDisplaySize(cs, zoom)
    const n = naturalSize

    const scale = n.w / imgW
    const left = (cs - imgW) / 2 + position.x
    const top = (cs - imgH) / 2 + position.y

    const canvas = document.createElement("canvas")
    canvas.width = 400
    canvas.height = 400
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.drawImage(
      img,
      -left * scale,
      -top * scale,
      cs * scale,
      cs * scale,
      0, 0, 400, 400,
    )

    canvas.toBlob((blob) => {
      if (blob) onCrop(blob)
    }, "image/jpeg", 0.9)
  }

  const cs = cropSize || 280
  const { w: imgW, h: imgH } = getDisplaySize(cs, zoom)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-scale-in">
        <button onClick={onClose} className="absolute top-4 right-4 text-wine-400 hover:text-wine-600 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-lg font-bold text-wine-900 mb-4">Beskjær bilde</h2>

        <div
          ref={containerRef}
          className="relative mx-auto overflow-hidden rounded-2xl bg-black/10 cursor-grab active:cursor-grabbing select-none touch-none"
          style={{ width: cs, height: cs }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center text-wine-400 text-sm">
              Laster bilde...
            </div>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imageRef}
            src={imageUrl}
            alt=""
            draggable={false}
            onLoad={() => {
              if (imageRef.current) {
                const nw = imageRef.current.naturalWidth
                const nh = imageRef.current.naturalHeight
                naturalRef.current = { w: nw, h: nh }
                setNaturalSize({ w: nw, h: nh })
                setImageLoaded(true)
              }
            }}
            className="absolute pointer-events-none"
            style={{
              width: imgW,
              height: imgH,
              maxWidth: "none",
              left: (cs - imgW) / 2 + position.x,
              top: (cs - imgH) / 2 + position.y,
            }}
          />
        </div>

        <div className="mt-4 flex items-center gap-3">
          <svg className="w-4 h-4 text-wine-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
          </svg>
          <input
            type="range"
            min="1"
            max="3"
            step="0.05"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="flex-1 accent-wine-600"
          />
          <svg className="w-4 h-4 text-wine-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
          </svg>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={doCrop}
            disabled={!imageLoaded}
            className="flex-1 rounded-full bg-gradient-to-r from-wine-600 to-wine-700 px-4 py-2.5 text-sm font-medium text-white hover:from-wine-700 hover:to-wine-800 disabled:opacity-50 transition-all"
          >
            Bekreft
          </button>
          <button
            onClick={onClose}
            className="rounded-full border border-cream-300 px-4 py-2.5 text-sm font-medium text-wine-600 hover:bg-cream-50 transition-colors"
          >
            Avbryt
          </button>
        </div>
      </div>
    </div>
  )
}
