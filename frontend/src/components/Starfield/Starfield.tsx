import { useEffect, useRef } from 'react'

import styles from './Starfield.module.css'

// The animated backdrop for the command console: a faint, slow-drifting field of
// twinkling stars with a cyan shooting star streaking past every few seconds.
// Mounted once in App, behind the console shell (pointer-events: none, z-index 0).
//
// Honors prefers-reduced-motion: the field is still painted (so the page never
// looks broken), but drift, twinkle, and shooting stars are frozen. All work is
// torn down on unmount, the rAF loop, the shooter interval, and the resize
// listener, so nothing leaks if the component ever remounts.

interface Star {
  x: number
  y: number
  r: number
  a: number
  tw: number
  vy: number
}

interface Shooter {
  x: number
  y: number
  len: number
  sp: number
  life: number
}

export function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let width = 0
    let height = 0
    let stars: Star[] = []
    const shooters: Shooter[] = []

    const resize = () => {
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
      stars = []
      const count = Math.floor((width * height) / 6000)
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          r: Math.random() * 1.3 + 0.2,
          a: Math.random() * 0.6 + 0.2,
          tw: Math.random() * 0.02,
          vy: Math.random() * 0.06 + 0.01,
        })
      }
    }

    const spawnShooter = () => {
      const fromLeft = Math.random() > 0.5
      shooters.push({
        x: fromLeft ? Math.random() * width * 0.5 : Math.random() * width,
        y: Math.random() * height * 0.4,
        len: Math.random() * 80 + 60,
        sp: Math.random() * 6 + 6,
        life: 1,
      })
    }

    let t = 0
    let raf = 0
    const frame = () => {
      ctx.clearRect(0, 0, width, height)
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i]
        const twinkle = reduce ? 0 : Math.sin(t * s.tw + i) * 0.25
        ctx.globalAlpha = Math.max(0, Math.min(1, s.a + twinkle))
        ctx.fillStyle = '#bfe6ff'
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fill()
        if (!reduce) {
          s.y += s.vy
          if (s.y > height) {
            s.y = 0
            s.x = Math.random() * width
          }
        }
      }
      for (let j = shooters.length - 1; j >= 0; j--) {
        const sh = shooters[j]
        const grad = ctx.createLinearGradient(
          sh.x,
          sh.y,
          sh.x - sh.len,
          sh.y - sh.len * 0.5,
        )
        grad.addColorStop(0, 'rgba(95,208,255,0.9)')
        grad.addColorStop(1, 'rgba(95,208,255,0)')
        ctx.globalAlpha = sh.life
        ctx.strokeStyle = grad
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(sh.x, sh.y)
        ctx.lineTo(sh.x - sh.len, sh.y - sh.len * 0.5)
        ctx.stroke()
        sh.x += sh.sp
        sh.y += sh.sp * 0.5
        sh.life -= 0.012
        if (sh.life <= 0) shooters.splice(j, 1)
      }
      ctx.globalAlpha = 1
      t++
      raf = window.requestAnimationFrame(frame)
    }

    resize()
    window.addEventListener('resize', resize)
    raf = window.requestAnimationFrame(frame)

    // Ambient: a streak every few seconds (skipped under reduced motion).
    let shooterTimer = 0
    if (!reduce) {
      shooterTimer = window.setInterval(() => {
        if (Math.random() > 0.4) spawnShooter()
      }, 2600)
    }

    return () => {
      window.cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      if (shooterTimer) window.clearInterval(shooterTimer)
    }
  }, [])

  return <canvas ref={canvasRef} className={styles.starfield} aria-hidden="true" />
}
