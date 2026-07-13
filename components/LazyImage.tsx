'use client'

import { useRef, useState, useEffect } from 'react'

interface Props {
  src: string
  alt: string
  className?: string
  width?: number
  height?: number
}

export default function LazyImage({ src, alt, className, width = 48, height = 48 }: Props) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const imgRef = useRef<HTMLDivElement>(null)
  const [inView] = useState(() => {
    if (typeof window === 'undefined') return true
    if (!('IntersectionObserver' in window)) return true
    return false
  })

  const [inViewFromObserver, setInViewFromObserver] = useState(false)

  useEffect(() => {
    if (inView) return
    const el = imgRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInViewFromObserver(true)
          observer.disconnect()
        }
      },
      { rootMargin: '200px' }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [inView])

  const shouldLoad = inView || inViewFromObserver

  return (
    <div ref={imgRef} className={className} style={{ width, height }}>
      {shouldLoad && !error ? (
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: loaded ? 1 : 0,
            transition: 'opacity 0.2s ease',
          }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            background: 'var(--panel-2)',
            borderRadius: 4,
          }}
        />
      )}
    </div>
  )
}
