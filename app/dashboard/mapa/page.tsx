'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { PixelAgent, PixelMonitor } from '@/components/ui/pixel-agent'
import { AGENTES } from '@/lib/hub-agentes'

// ─────────────────────────────────────────────────────────
// Floor plan layout  (container: 760 × 390 px)
// ─────────────────────────────────────────────────────────

type RoomKey = 'ceo' | 'pm' | 'cmo' | 'copy' | 'analista' | 'dev' | 'content' | 'chief' | 'meeting'

const ROOM_W = 190
const ROOM_H = 160
const HALL_Y = ROOM_H          // 160
const HALL_H = 70
const BOTTOM_Y = HALL_Y + HALL_H  // 230
const FLOOR_W = ROOM_W * 4    // 760
const FLOOR_H = BOTTOM_Y + ROOM_H // 390

const ROOMS: Record<RoomKey, { label: string; x: number; y: number; w: number; h: number }> = {
  ceo:      { label: 'CEO',       x:          0, y:         0, w: ROOM_W, h: ROOM_H },
  pm:       { label: 'PM',        x:     ROOM_W, y:         0, w: ROOM_W, h: ROOM_H },
  cmo:      { label: 'CMO',       x: ROOM_W * 2, y:         0, w: ROOM_W, h: ROOM_H },
  copy:     { label: 'Copy',      x: ROOM_W * 3, y:         0, w: ROOM_W, h: ROOM_H },
  meeting:  { label: 'Reunião',   x:      ROOM_W, y: HALL_Y + 8, w: ROOM_W * 2, h: HALL_H - 16 },
  analista: { label: 'Análise',   x:          0, y: BOTTOM_Y, w: ROOM_W, h: ROOM_H },
  dev:      { label: 'Dev/CTO',   x:     ROOM_W, y: BOTTOM_Y, w: ROOM_W, h: ROOM_H },
  content:  { label: 'Conteúdo',  x: ROOM_W * 2, y: BOTTOM_Y, w: ROOM_W, h: ROOM_H },
  chief:    { label: 'Chief',     x: ROOM_W * 3, y: BOTTOM_Y, w: ROOM_W, h: ROOM_H },
}

const HOME: Record<string, RoomKey> = {
  ceo: 'ceo', pm: 'pm', cmo: 'cmo', copywriter: 'copy',
  analista: 'analista', dev: 'dev', conteudo: 'content', chief: 'chief',
}

const OWNER: Partial<Record<RoomKey, string>> = {
  ceo: 'ceo', pm: 'pm', cmo: 'cmo', copy: 'copywriter',
  analista: 'analista', dev: 'dev', content: 'conteudo', chief: 'chief',
}

const WALKABLE: RoomKey[] = ['ceo', 'pm', 'cmo', 'copy', 'analista', 'dev', 'content', 'chief', 'meeting']

// Agent pixel position: near the desk in their room
function agentPos(key: RoomKey): { x: number; y: number } {
  const r = ROOMS[key]
  if (key === 'meeting') {
    return { x: r.x + r.w / 2 - 12, y: r.y + 4 }
  }
  // Place agent near the desk (close to bottom of room)
  return { x: r.x + r.w / 2 - 12, y: r.y + r.h - 60 }
}

// ─────────────────────────────────────────────────────────
// State types
// ─────────────────────────────────────────────────────────

type AgentState = {
  id: string
  cor: string
  inicial: string
  nome: string
  x: number
  y: number
  walking: boolean
  room: RoomKey
}

function initAgents(): AgentState[] {
  return AGENTES.map(a => {
    const room = (HOME[a.id] ?? 'meeting') as RoomKey
    const pos = agentPos(room)
    return { id: a.id, cor: a.cor, inicial: a.inicial, nome: a.nome, ...pos, walking: false, room }
  })
}

// ─────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────

export default function MapaPage() {
  const [agents, setAgents] = useState<AgentState[]>(initAgents)
  const aliveRef = useRef(true)
  const agentsRef = useRef(agents)

  useEffect(() => { agentsRef.current = agents }, [agents])

  useEffect(() => {
    aliveRef.current = true

    function doWalk() {
      if (!aliveRef.current) return

      const current = agentsRef.current
      const idle = current.filter(a => !a.walking)
      if (idle.length > 0) {
        const agent = idle[Math.floor(Math.random() * idle.length)]
        const choices = WALKABLE.filter(r => r !== agent.room)
        const target = choices[Math.floor(Math.random() * choices.length)]
        const pos = agentPos(target)
        const agentId = agent.id

        setAgents(prev => prev.map(a =>
          a.id === agentId ? { ...a, ...pos, walking: true, room: target } : a
        ))

        // Arrive at destination
        setTimeout(() => {
          if (!aliveRef.current) return
          setAgents(prev => prev.map(a => a.id === agentId ? { ...a, walking: false } : a))

          // Pause, then return home
          const pause = 1500 + Math.random() * 2000
          setTimeout(() => {
            if (!aliveRef.current) return
            const cur = agentsRef.current.find(a => a.id === agentId)
            const homeKey = (HOME[agentId] ?? 'meeting') as RoomKey
            if (cur && cur.room !== homeKey) {
              const homePos = agentPos(homeKey)
              setAgents(prev => prev.map(a =>
                a.id === agentId ? { ...a, ...homePos, walking: true, room: homeKey } : a
              ))
              setTimeout(() => {
                if (!aliveRef.current) return
                setAgents(prev => prev.map(a => a.id === agentId ? { ...a, walking: false } : a))
              }, 2100)
            }
          }, pause)
        }, 2100)
      }

      // Re-schedule next walk
      const nextDelay = 2200 + Math.random() * 3000
      setTimeout(doWalk, nextDelay)
    }

    const initDelay = setTimeout(doWalk, 1200)
    return () => {
      aliveRef.current = false
      clearTimeout(initDelay)
    }
  }, [])

  const walkingCount = agents.filter(a => a.walking).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>FactorHub HQ — Ao Vivo</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            8 departamentos ·{' '}
            {walkingCount > 0
              ? <span style={{ color: '#e8622a' }}>{walkingCount} agente{walkingCount > 1 ? 's' : ''} em trânsito</span>
              : 'todos em suas salas'
            }
          </div>
        </div>
        <motion.div
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ repeat: Infinity, duration: 1.6 }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9.5, color: '#3a3a3a', fontWeight: 700, letterSpacing: '0.1em' }}
        >
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#22C55E' }} />
          LIVE
        </motion.div>
      </div>

      {/* Map card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Floor container */}
        <div
          style={{
            position: 'relative',
            width: FLOOR_W,
            height: FLOOR_H,
            maxWidth: '100%',
            background: '#090909',
            overflow: 'hidden',
          }}
        >
          {/* Grid pattern */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: [
              'linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px)',
              'linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)',
            ].join(','),
            backgroundSize: '16px 16px',
            pointerEvents: 'none',
          }} />

          {/* Corridor / hall */}
          <div style={{
            position: 'absolute',
            left: 0, top: HALL_Y,
            width: FLOOR_W, height: HALL_H,
            background: 'rgba(255,255,255,0.012)',
            borderTop: '0.5px solid #1f1f1f',
            borderBottom: '0.5px solid #1f1f1f',
          }} />

          {/* Rooms */}
          {(Object.entries(ROOMS) as [RoomKey, (typeof ROOMS)[RoomKey]][]).map(([key, room]) => {
            const ownerId = OWNER[key]
            const owner = ownerId ? AGENTES.find(a => a.id === ownerId) : null
            const roomColor = owner?.cor ?? '#e8622a'
            const isMeeting = key === 'meeting'

            return (
              <div
                key={key}
                style={{
                  position: 'absolute',
                  left: room.x, top: room.y,
                  width: room.w, height: room.h,
                  background: `${roomColor}${isMeeting ? '06' : '08'}`,
                  border: `0.5px solid ${roomColor}${isMeeting ? '20' : '28'}`,
                  borderRadius: isMeeting ? 4 : 0,
                  overflow: 'hidden',
                  boxSizing: 'border-box',
                }}
              >
                {/* Room label */}
                <div style={{
                  position: 'absolute', top: 6, left: 8,
                  fontSize: 7, fontWeight: 700,
                  color: `${roomColor}${isMeeting ? 'aa' : '88'}`,
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                }}>
                  {room.label}
                </div>

                {/* Meeting room table */}
                {isMeeting && (
                  <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 80, height: 12,
                    background: '#1a1810',
                    border: '0.5px solid #2a2818',
                    borderRadius: 3,
                  }} />
                )}

                {/* Desk + monitor for regular rooms */}
                {!isMeeting && (
                  <>
                    <div style={{
                      position: 'absolute', bottom: 18, left: '50%', transform: 'translateX(-50%)',
                      width: 54, height: 7,
                      background: '#191916',
                      border: '0.5px solid #252520',
                      borderRadius: 2,
                    }} />
                    <div style={{
                      position: 'absolute', bottom: 25, left: '50%', transform: 'translateX(-50%)',
                    }}>
                      <PixelMonitor color={roomColor} scale={2} />
                    </div>
                  </>
                )}

                {/* Room walls (corner accents) */}
                <div style={{
                  position: 'absolute', top: 0, left: 0,
                  width: 3, height: 3,
                  background: `${roomColor}40`,
                }} />
                <div style={{
                  position: 'absolute', top: 0, right: 0,
                  width: 3, height: 3,
                  background: `${roomColor}40`,
                }} />
                <div style={{
                  position: 'absolute', bottom: 0, left: 0,
                  width: 3, height: 3,
                  background: `${roomColor}40`,
                }} />
                <div style={{
                  position: 'absolute', bottom: 0, right: 0,
                  width: 3, height: 3,
                  background: `${roomColor}40`,
                }} />
              </div>
            )
          })}

          {/* Agent sprites — float above rooms */}
          {agents.map(agent => (
            <motion.div
              key={agent.id}
              animate={{ x: agent.x, y: agent.y }}
              transition={{
                type: 'tween',
                duration: agent.walking ? 2.0 : 0,
                ease: 'easeInOut',
              }}
              style={{
                position: 'absolute',
                left: 0, top: 0,
                zIndex: 10,
                filter: agent.walking ? `drop-shadow(0 0 4px ${agent.cor})` : 'none',
                transition: 'filter 0.3s',
              }}
            >
              <PixelAgent
                agentColor={agent.cor}
                scale={3}
                animate={agent.walking}
                seated={!agent.walking}
              />
              {/* Name chip */}
              <div style={{
                fontSize: 6, fontWeight: 800, color: agent.cor,
                textAlign: 'center', letterSpacing: '0.04em',
                marginTop: 1, lineHeight: 1,
                fontFamily: "'DM Mono', monospace",
                textShadow: `0 0 6px ${agent.cor}60`,
              }}>
                {agent.inicial}
              </div>
            </motion.div>
          ))}

          {/* Scanline overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.15) 3px, rgba(0,0,0,0.15) 4px)',
            pointerEvents: 'none', zIndex: 20,
          }} />
        </div>

        {/* Legend */}
        <div style={{
          padding: '10px 16px 12px',
          borderTop: '0.5px solid var(--border)',
          display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center',
        }}>
          {agents.map(agent => {
            const roomLabel = ROOMS[agent.room]?.label ?? agent.room
            return (
              <div key={agent.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <motion.div
                  animate={agent.walking ? { opacity: [1, 0.4, 1] } : { opacity: 1 }}
                  transition={agent.walking ? { repeat: Infinity, duration: 0.5 } : {}}
                  style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: agent.cor,
                    boxShadow: agent.walking ? `0 0 5px ${agent.cor}` : 'none',
                  }}
                />
                <span style={{ fontSize: 10, color: agent.walking ? 'var(--text)' : 'var(--text-muted)' }}>
                  {agent.inicial}
                </span>
                {agent.walking && (
                  <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>→ {roomLabel}</span>
                )}
              </div>
            )
          })}
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.05em' }}>
            Agentes movendo em tempo real
          </span>
        </div>
      </div>

      {/* Department roster */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {AGENTES.map(a => {
          const state = agents.find(ag => ag.id === a.id)!
          const atHome = state.room === HOME[a.id]
          return (
            <motion.div
              key={a.id}
              className="card"
              style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 9 }}
              animate={state.walking ? { borderColor: `${a.cor}50` } : { borderColor: 'var(--border)' }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: 6, background: a.cor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 800, color: '#fff', flexShrink: 0,
              }}>
                {a.inicial}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {a.nome.split(' ')[0]}
                </div>
                <div style={{ fontSize: 9, color: state.walking ? '#e8622a' : atHome ? 'var(--text-dim)' : '#22C55E', marginTop: 1 }}>
                  {state.walking ? `→ ${ROOMS[state.room]?.label}` : atHome ? ROOMS[state.room]?.label : `em ${ROOMS[state.room]?.label}`}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
