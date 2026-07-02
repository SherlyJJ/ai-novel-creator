import { useEffect, useRef } from 'react'

export default function BackgroundEffects() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const spotlightRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = window.innerWidth
    let height = window.innerHeight
    canvas.width = width
    canvas.height = height

    const colors = ['#6366F1', '#06B6D4', '#EC4899', '#8B5CF6']
    const orbs: Array<{
      x: number
      y: number
      vx: number
      vy: number
      radius: number
      color: string
    }> = []

    for (let i = 0; i < 7; i++) {
      orbs.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 1.2,
        vy: (Math.random() - 0.5) * 1.2,
        radius: Math.random() * 80 + 140,
        color: colors[Math.floor(Math.random() * colors.length)],
      })
    }

    let animationId: number
    const animate = () => {
      ctx.clearRect(0, 0, width, height)

      orbs.forEach((orb) => {
        orb.x += orb.vx
        orb.y += orb.vy
        if (orb.x < -150 || orb.x > width + 150) orb.vx *= -1
        if (orb.y < -150 || orb.y > height + 150) orb.vy *= -1

        const g = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.radius)
        g.addColorStop(0, orb.color + '40')
        g.addColorStop(0.4, orb.color + '16')
        g.addColorStop(1, 'transparent')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2)
        ctx.fill()
      })

      for (let i = 0; i < orbs.length; i++) {
        for (let j = i + 1; j < orbs.length; j++) {
          const dx = orbs[i].x - orbs[j].x
          const dy = orbs[i].y - orbs[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 450) {
            ctx.beginPath()
            ctx.moveTo(orbs[i].x, orbs[i].y)
            ctx.lineTo(orbs[j].x, orbs[j].y)
            ctx.strokeStyle = `rgba(99,102,241,${0.18 * (1 - dist / 450)})`
            ctx.lineWidth = 2
            ctx.stroke()
          }
          if (dist < 280) {
            const mx = (orbs[i].x + orbs[j].x) / 2
            const my = (orbs[i].y + orbs[j].y) / 2
            const g = ctx.createRadialGradient(mx, my, 0, mx, my, 70)
            g.addColorStop(0, 'rgba(255,255,255,0.45)')
            g.addColorStop(0.5, 'rgba(255,255,255,0.15)')
            g.addColorStop(1, 'transparent')
            ctx.fillStyle = g
            ctx.beginPath()
            ctx.arc(mx, my, 70, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }

      animationId = requestAnimationFrame(animate)
    }

    animate()

    const handleResize = () => {
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width
      canvas.height = height
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (spotlightRef.current) {
        spotlightRef.current.style.setProperty('--x', `${(e.clientX / width) * 100}%`)
        spotlightRef.current.style.setProperty('--y', `${(e.clientY / height) * 100}%`)
      }
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('mousemove', handleMouseMove)

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])

  return (
    <>
      <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none" />
      <div
        ref={spotlightRef}
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle 600px at var(--x,50%) var(--y,50%), rgba(99,102,241,0.08) 0%, transparent 45%)',
        }}
      />
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(99,102,241,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.06) 1px, transparent 1px)',
          backgroundSize: '100px 100px',
          animation: 'gridMove 30s linear infinite',
        }}
      />
      <style>{`
        @keyframes gridMove {
          0% { background-position: 0 0, 0 0; }
          100% { background-position: 100px 100px, 100px 100px; }
        }
      `}</style>
    </>
  )
}
