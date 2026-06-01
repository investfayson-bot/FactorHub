'use client'

import { createContext, useContext, useState, useRef, useCallback, useEffect, type ReactNode } from 'react'
import { MISSION_LEVELS, AGENTS_V2, getPhaseLabel as getPhaseLabelLib } from '@/lib/agents-v2'

// ─── Types ────────────────────────────────────────────────────────────────────

export type MissionState = 'idle' | 'running' | 'completed' | 'error'

export type AgentStep = {
  agentId: string
  agentName: string
  layer: string
  layerLabel: string
  color: string
  output: string
  tokensUsed: number
  status: 'waiting' | 'running' | 'done'
}

export type PhaseState = {
  phaseIndex: number
  phaseLabel: string
  agents: AgentStep[]
  status: 'waiting' | 'running' | 'done'
}

export type MissionRecord = {
  id: string
  title: string
  level: string
  status: string
  created_at: string
  total_tokens: number
  cost_usd: number
  agents_used: string[]
}

export type CompletedStep = { agentId: string; agentName: string; color: string; output: string }

// ─── Context ──────────────────────────────────────────────────────────────────

type MissionCtx = {
  missionText: string
  setMissionText: (t: string) => void
  selectedLevel: string
  setSelectedLevel: (l: string) => void
  state: MissionState
  phases: PhaseState[]
  completedSteps: CompletedStep[]
  currentAgentId: string | null
  currentToken: string
  summary: string
  missionId: string | null
  totalTokens: number
  costUsd: number
  errorMsg: string
  missions: MissionRecord[]
  startMission: () => Promise<void>
  cancelMission: () => void
  newMission: () => void
  loadMissions: () => Promise<void>
  approveMission: () => Promise<void>
  archiveMission: () => Promise<void>
  reactivateMission: (id: string) => Promise<void>
  deleteMission: (id: string) => Promise<void>
}

const MissionContext = createContext<MissionCtx | null>(null)

export function useMission() {
  const ctx = useContext(MissionContext)
  if (!ctx) throw new Error('useMission must be inside MissionProvider')
  return ctx
}

// ─── Provider ─────────────────────────────────────────────────────────────────

async function getToken() {
  const { supabase } = await import('@/lib/supabase')
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? ''
}

function initPhases(level: string): PhaseState[] {
  const ml = MISSION_LEVELS[level]
  return ml.chains.map((phase, pi) => ({
    phaseIndex: pi,
    phaseLabel: getPhaseLabelLib(pi, ml.chains),
    status: 'waiting' as const,
    agents: phase.map(agentId => {
      const a = AGENTS_V2[agentId]
      return {
        agentId,
        agentName: a?.name ?? agentId,
        layer: a?.layer ?? 'C1',
        layerLabel: a?.layerLabel ?? '',
        color: a?.color ?? '#666',
        output: '',
        tokensUsed: 0,
        status: 'waiting' as const,
      }
    }),
  }))
}

export function MissionProvider({ children }: { children: ReactNode }) {
  const [missionText, setMissionText] = useState('')
  const [selectedLevel, setSelectedLevel] = useState('N2')
  const [state, setState] = useState<MissionState>('idle')
  const [phases, setPhases] = useState<PhaseState[]>([])
  const [completedSteps, setCompletedSteps] = useState<CompletedStep[]>([])
  const [currentAgentId, setCurrentAgentId] = useState<string | null>(null)
  const [currentToken, setCurrentToken] = useState('')
  const [summary, setSummary] = useState('')
  const [missionId, setMissionId] = useState<string | null>(null)
  const [totalTokens, setTotalTokens] = useState(0)
  const [costUsd, setCostUsd] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const [missions, setMissions] = useState<MissionRecord[]>([])
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => { loadMissions() }, [])

  const loadMissions = useCallback(async () => {
    try {
      const token = await getToken()
      const res = await fetch('/api/hub/missions-list', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (res.ok) {
        const { missions: list } = await res.json() as { missions: MissionRecord[] }
        setMissions(list ?? [])
      }
    } catch { /* ignore */ }
  }, [])

  const startMission = useCallback(async () => {
    if (!missionText.trim() || state === 'running') return

    setState('running')
    setErrorMsg('')
    setSummary('')
    setCompletedSteps([])
    setCurrentAgentId(null)
    setCurrentToken('')
    setTotalTokens(0)
    setCostUsd(0)
    setMissionId(null)
    setPhases(initPhases(selectedLevel))

    abortRef.current = new AbortController()

    try {
      const token = await getToken()
      const res = await fetch('/api/hub/mission', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ mission: missionText, level: selectedLevel }),
        signal: abortRef.current.signal,
      })

      if (!res.ok || !res.body) throw new Error(`Erro ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (!raw) continue

          try {
            const evt = JSON.parse(raw) as Record<string, unknown>

            if (evt.event === 'mission_start') setMissionId(evt.missionId as string)

            if (evt.event === 'phase_start') {
              const pi = evt.phaseIndex as number
              setPhases(prev => prev.map((p, i) => i === pi ? { ...p, status: 'running' } : p))
            }

            if (evt.event === 'agent_start') {
              const agId = evt.agentId as string
              const pi = evt.phaseIndex as number
              setCurrentAgentId(agId)
              setCurrentToken('')
              setPhases(prev => prev.map((p, i) => i === pi ? {
                ...p,
                agents: p.agents.map(a => a.agentId === agId ? { ...a, status: 'running' } : a),
              } : p))
            }

            if (evt.event === 'token') setCurrentToken(prev => prev + (evt.token as string))

            if (evt.event === 'agent_done') {
              const agId = evt.agentId as string
              const output = evt.output as string
              const pi = evt.phaseIndex as number
              const tokens = evt.tokensUsed as number
              const a = AGENTS_V2[agId]
              setCompletedSteps(prev => [...prev, { agentId: agId, agentName: a?.name ?? agId, color: a?.color ?? '#666', output }])
              setPhases(prev => prev.map((p, i) => i === pi ? {
                ...p,
                agents: p.agents.map(ag => ag.agentId === agId ? { ...ag, status: 'done', output, tokensUsed: tokens } : ag),
              } : p))
              setCurrentToken('')
            }

            if (evt.event === 'phase_done') {
              const pi = evt.phaseIndex as number
              setPhases(prev => prev.map((p, i) => i === pi ? { ...p, status: 'done' } : p))
            }

            if (evt.event === 'mission_done') {
              setCurrentAgentId(null)
              setSummary(evt.summary as string)
              setTotalTokens(evt.totalTokens as number)
              setCostUsd(evt.costUsd as number)
              setState('completed')
              loadMissions()
            }

            if (evt.event === 'error') throw new Error(evt.message as string)

          } catch (e) {
            if (e instanceof SyntaxError) continue
            throw e
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') { setState('idle'); return }
      setErrorMsg(err instanceof Error ? err.message : 'Erro desconhecido')
      setState('error')
    }
  }, [missionText, selectedLevel, state, loadMissions])

  const cancelMission = useCallback(() => {
    abortRef.current?.abort()
    setState('idle')
  }, [])

  const newMission = useCallback(() => {
    setState('idle')
    setMissionText('')
    setPhases([])
    setCompletedSteps([])
    setSummary('')
    setCurrentAgentId(null)
    setCurrentToken('')
    setErrorMsg('')
  }, [])

  const approveMission = useCallback(async () => {
    if (!missionId) return
    const token = await getToken()
    await fetch('/api/hub/missions-list', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ missionId, status: 'approved' }),
    })
    await loadMissions()
    newMission()
  }, [missionId, loadMissions, newMission])

  const archiveMission = useCallback(async () => {
    if (!missionId) return
    const token = await getToken()
    await fetch('/api/hub/missions-list', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ missionId, status: 'archived' }),
    })
    loadMissions()
    newMission()
  }, [missionId, loadMissions, newMission])

  const reactivateMission = useCallback(async (id: string) => {
    const token = await getToken()
    await fetch('/api/hub/missions-list', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ missionId: id, status: 'draft' }),
    })
    loadMissions()
  }, [loadMissions])

  const deleteMission = useCallback(async (id: string) => {
    const token = await getToken()
    await fetch('/api/hub/missions-list', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ missionId: id }),
    })
    loadMissions()
  }, [loadMissions])

  return (
    <MissionContext.Provider value={{
      missionText, setMissionText,
      selectedLevel, setSelectedLevel,
      state, phases, completedSteps,
      currentAgentId, currentToken,
      summary, missionId,
      totalTokens, costUsd, errorMsg,
      missions,
      startMission, cancelMission, newMission,
      loadMissions, approveMission, archiveMission,
      reactivateMission, deleteMission,
    }}>
      {children}
    </MissionContext.Provider>
  )
}
