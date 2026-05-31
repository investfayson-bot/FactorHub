'use client'

import { motion } from 'framer-motion'

// Darken a hex color by amount (0-255)
function darken(hex: string, amount = 40): string {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, (n >> 16) - amount)
  const g = Math.max(0, ((n >> 8) & 0xff) - amount)
  const b = Math.max(0, (n & 0xff) - amount)
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`
}

type PixelGrid = (string | null)[][]

function buildSprite(agentColor: string, seated = false): PixelGrid {
  const S = '#FFCB8F'   // skin
  const H = darken(agentColor, 50)   // hair
  const C = agentColor               // shirt
  const P = '#2D3142'               // pants
  const F = '#1A1C2C'               // shoes
  const E = '#1A1C2C'               // eyes

  if (seated) {
    return [
      [null,null, H,   H,   H,   H,  null,null],
      [null, H,   H,   H,   H,   H,   H,  null],
      [null,null, S,   S,   S,   S,  null,null],
      [null,null, S,   E,   S,   E,  null,null],
      [null,null, S,   S,   S,   S,  null,null],
      [null,null,null, S,   S,  null,null,null],
      [null, C,   C,   C,   C,   C,   C,  null],
      [ C,   C,   C,   C,   C,   C,   C,   C ],
      [null, C,   C,   C,   C,   C,   C,  null],
      [null,null, P,   P,   P,   P,  null,null],
      [null, P,   P,   P,   P,   P,   P,  null],
    ]
  }

  return [
    [null,null, H,   H,   H,   H,  null,null],
    [null, H,   H,   H,   H,   H,   H,  null],
    [null,null, S,   S,   S,   S,  null,null],
    [null,null, S,   E,   S,   E,  null,null],
    [null,null, S,   S,   S,   S,  null,null],
    [null,null,null, S,   S,  null,null,null],
    [null, C,   C,   C,   C,   C,   C,  null],
    [ C,   C,   C,   C,   C,   C,   C,   C ],
    [null, C,   C,   C,   C,   C,   C,  null],
    [null,null, C,   C,   C,   C,  null,null],
    [null,null, P,   P,   P,   P,  null,null],
    [null, P,   P,  null, null,  P,   P,  null],
    [null, P,   P,  null, null,  P,   P,  null],
    [null, F,   F,  null, null,  F,   F,  null],
  ]
}

// Walking frame 2 - legs shifted
function buildWalkFrame(agentColor: string): PixelGrid {
  const base = buildSprite(agentColor)
  const P = '#2D3142'
  const F = '#1A1C2C'
  return [
    ...base.slice(0, 11),
    [null, null, P, P, null, null, P, P],
    [null, null, P, P, null, null, P, P],
    [null, null, F, F, null, null, F, F],
  ]
}

interface PixelAgentProps {
  agentColor: string
  scale?: number
  animate?: boolean
  seated?: boolean
}

export function PixelAgent({ agentColor, scale = 4, animate = false, seated = false }: PixelAgentProps) {
  const frame1 = buildSprite(agentColor, seated)
  const frame2 = buildWalkFrame(agentColor)
  const rows = animate ? frame2 : frame1
  const W = 8
  const H = rows.length

  return (
    <motion.div
      style={{ display: 'inline-block', lineHeight: 0 }}
      animate={animate ? { y: [0, -2, 0] } : { y: [0, -1, 0] }}
      transition={{ repeat: Infinity, duration: animate ? 0.4 : 2.5, ease: 'easeInOut' }}
    >
      <svg
        width={W * scale}
        height={H * scale}
        style={{ imageRendering: 'pixelated', display: 'block' }}
      >
        {rows.flatMap((row, y) =>
          row.map((color, x) =>
            color ? (
              <rect
                key={`${x}-${y}`}
                x={x * scale}
                y={y * scale}
                width={scale}
                height={scale}
                fill={color}
              />
            ) : null
          )
        )}
      </svg>
    </motion.div>
  )
}

// Pixel monitor/computer
export function PixelMonitor({ color, scale = 3 }: { color: string; scale?: number }) {
  const D = '#1A1C2C'  // dark frame
  const S = '#0B0E1A'  // screen dark
  const G = color       // glow/text color

  const rows: (string | null)[][] = [
    [null, D,  D,  D,  D,  D,  D,  D,  D, null],
    [ D,   D,  S,  S,  S,  S,  S,  S,  D,  D  ],
    [ D,   D,  S,  G,  G,  S,  G,  S,  D,  D  ],
    [ D,   D,  S,  S,  G,  G,  S,  S,  D,  D  ],
    [ D,   D,  S,  G,  S,  S,  G,  S,  D,  D  ],
    [ D,   D,  S,  S,  S,  S,  S,  S,  D,  D  ],
    [ D,   D,  D,  D,  D,  D,  D,  D,  D,  D  ],
    [null,null,null, D,  D,  D,  D, null,null,null],
    [null, D,  D,  D,  D,  D,  D,  D,  D, null],
  ]
  const W = 10
  const H = rows.length

  return (
    <motion.div
      style={{ lineHeight: 0, display: 'inline-block' }}
      animate={{ opacity: [0.85, 1, 0.85] }}
      transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
    >
      <svg width={W * scale} height={H * scale} style={{ imageRendering: 'pixelated', display: 'block' }}>
        {rows.flatMap((row, y) =>
          row.map((c, x) =>
            c ? <rect key={`${x}-${y}`} x={x*scale} y={y*scale} width={scale} height={scale} fill={c} /> : null
          )
        )}
      </svg>
    </motion.div>
  )
}
