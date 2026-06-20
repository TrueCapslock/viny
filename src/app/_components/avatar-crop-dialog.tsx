"use client"

import { useState, useRef, useCallback, useEffect } from "react"

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
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [imageLoaded, setImageLoaded] = useState(false)
  const [cropSize, setCropSize] = useState(0)
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 })

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

  useEffect(() => {
    if (!cropSize) return
    const cs = cropSize
    setPosition((prev) => clampPosition(prev, cs))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cropSize, zoom])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setDragging(true)
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
  }, [position])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    })
  }, [dragging, dragStart])

  const handleMouseUp = useCallback(() => {
    setDragging(false)
    const cs = cropSize || 280
    setPosition((prev) => clampPosition(prev, cs))
  }, [cropSize, zoom])

  function getDisplaySize(cs: number, z: number) {
    const aspect = imageLoaded ? naturalSize.w / naturalSize.h : 1
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

    const scale = naturalSize.w / imgW
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

  function clampPosition(pos: { x: number; y: number }, cs: number) {
    const { w: imgW, h: imgH } = getDisplaySize(cs, zoom)
    const maxX = (imgW - cs) / 2
    const maxY = (imgH - cs) / 2
    return {
      x: Math.min(maxX, Math.max(-maxX, pos.x)),
      y: Math.min(maxY, Math.max(-maxY, pos.y)),
    }
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
            className="relative mx-auto overflow-hidden rounded-2xl bg-black/10"
            style={{ width: cs, height: cs }}
          >
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center text-wine-400 text-sm">
                Laster bilde...
              </div>
            )}
            <div
              className="w-full h-full cursor-grab active:cursor-grabbing select-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imageRef}
                src={imageUrl}
                alt=""
                draggable={false}
                onLoad={() => {
                  if (imageRef.current) {
                    setNaturalSize({ w: imageRef.current.naturalWidth, h: imageRef.current.naturalHeight })
                    setImageLoaded(true)
                  }
                }}
                className="absolute pointer-events-none"
                style={{
                  width: imgW,
                  height: imgH,
                  left: (cs - imgW) / 2 + position.x,
                  top: (cs - imgH) / 2 + position.y,
                }}
              />
            </div>
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
