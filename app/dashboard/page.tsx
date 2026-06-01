'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { AGENTS_V2 } from '@/lib/agents-v2'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, LineChart, Line, Cell,
} from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────────────

type Mission = {
  id: string; title: string; level: string; status: string
  created_at: string; total_tokens: number; cost_usd: number; agents_used: string[]
}
type UsageRow = { agente_id: string; modelo: string; total_tokens: number; custo_usd: number; created_at: string }
type Projeto = { id: string; nome: string; status: string; progresso: number; categoria: string | null }
type Ideia = { id: string; status: string }
type CerebroRow = {
  nome_empresa?: string | null; slogan?: string | null; missao?: string | null
  produto_principal?: string | null; publico_alvo?: string | null; metas?: string | null
  dna_fundador?: string | null; knowledge_vault?: string | null; playbooks?: string | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const S_COLOR: Record<string, string> = {
  completed:'#3ecf8e', running:'#f59e0b', approved:'#3ecf8e',
  error:'#f44', archived:'#555', draft:'#888', awaiting_approval:'#f59e0b',
}
const S_LABEL: Record<string, string> = {
  completed:'Concluída', running:'Em andamento', approved:'Aprovada',
  error:'Erro', archived:'Arquivada', draft:'Rascunho', awaiting_approval:'Aguard. Aprovação',
}
const DAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
const HOURS_LBL = ['22h','18h','14h','10h','6h','2h']
const CEREBRO_FIELDS: {key: keyof CerebroRow; label: string}[] = [
  {key:'nome_empresa',label:'Empresa'},{key:'slogan',label:'Slogan'},
  {key:'missao',label:'Missão'},{key:'produto_principal',label:'Produto'},
  {key:'publico_alvo',label:'Público-alvo'},{key:'metas',label:'Metas'},
  {key:'dna_fundador',label:'DNA Fundador'},{key:'knowledge_vault',label:'Knowledge Base'},
  {key:'playbooks',label:'Playbooks'},
]
const PROJ_STATUS_COLOR: Record<string,string> = {
  ideia:'#f59e0b', planejamento:'#84cc16', desenvolvimento:'#a3a3a3', concluido:'#3ecf8e', pausado:'#555',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d:string) => new Date(d).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})
const fmtMoney = (v:number) => v < 0.001 ? `$${(v*1000).toFixed(2)}m` : `$${v.toFixed(4)}`
const timeAgo = (d:string) => {
  const m = Math.floor((Date.now()-new Date(d).getTime())/60000)
  if(m<1) return 'agora'; if(m<60) return `${m}m`
  const h = Math.floor(m/60); if(h<24) return `${h}h`
  return `${Math.floor(h/24)}d`
}

function buildHeatmap(items:{created_at:string}[]) {
  const g:number[][] = Array.from({length:6},()=>Array(7).fill(0))
  items.forEach(t=>{const d=new Date(t.created_at);g[5-Math.min(5,Math.floor(d.getHours()/4))][d.getDay()]++})
  return g
}
function heatColor(v:number,mx:number) {
  if(!v) return 'var(--surface-3)'
  const t=Math.min(v/Math.max(mx,1),1)
  return `rgba(62,207,142,${0.1+t*0.8})`
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function Tip({active,payload,label}:{active?:boolean;payload?:{value:number;name?:string;color?:string}[];label?:string}) {
  if(!active||!payload?.length) return null
  return (
    <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:6,padding:'7px 11px',fontSize:11}}>
      <div style={{color:'var(--text-muted)',marginBottom:4}}>{label}</div>
      {payload.map((p,i)=>(
        <div key={i} style={{color:p.color||'var(--text)',fontWeight:700,fontVariantNumeric:'tabular-nums'}}>{p.name && <span style={{color:'var(--text-muted)',marginRight:5}}>{p.name}</span>}{p.value}</div>
      ))}
    </div>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function KpiCard({label,value,sub,icon,color,href,sparkData}:{
  label:string;value:string|number;sub:string;icon:string;color:string;href?:string;sparkData?:number[]
}) {
  const router = useRouter()
  return (
    <motion.div
      variants={{hidden:{opacity:0,y:10},show:{opacity:1,y:0}}}
      transition={{duration:0.25,ease:'easeOut'}}
      onClick={()=>href&&router.push(href)}
      whileHover={href?{y:-1}:{}}
      style={{
        background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8,
        padding:'14px 16px',position:'relative',overflow:'hidden',
        cursor:href?'pointer':'default',
      }}
    >
      <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:color,opacity:.7}}/>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:8}}>
        <div style={{width:28,height:28,borderRadius:6,background:`${color}14`,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <i className={`fa-solid ${icon}`} style={{fontSize:11,color}}/>
        </div>
        {sparkData&&sparkData.length>1&&(
          <div style={{width:60,height:24}}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkData.map((v,i)=>({v,i}))}>
                <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      <div style={{fontSize:20,fontWeight:800,color:'var(--text)',lineHeight:1,fontVariantNumeric:'tabular-nums',letterSpacing:'-.5px'}}>{value}</div>
      <div style={{fontSize:11,fontWeight:600,color:'var(--text)',marginTop:5}}>{label}</div>
      <div style={{fontSize:9.5,color:'var(--text-muted)',marginTop:2}}>{sub}</div>
    </motion.div>
  )
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({title,sub,action}:{title:string;sub?:string;action?:{label:string;href:string}}) {
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',borderBottom:'1px solid var(--border)',flexShrink:0}}>
      <div>
        <span style={{fontSize:11,fontWeight:700,color:'var(--text)'}}>{title}</span>
        {sub&&<span style={{fontSize:10,color:'var(--text-muted)',marginLeft:8}}>{sub}</span>}
      </div>
      {action&&(
        <Link href={action.href} style={{fontSize:9.5,color:'var(--accent)',textDecoration:'none',fontWeight:600}}>
          {action.label} →
        </Link>
      )}
    </div>
  )
}

const card = {background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8,overflow:'hidden'} as const

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()
  const [missions, setMissions]   = useState<Mission[]>([])
  const [usage, setUsage]         = useState<UsageRow[]>([])
  const [cerebro, setCerebro]     = useState<CerebroRow|null>(null)
  const [projetos, setProjetos]   = useState<Projeto[]>([])
  const [ideias, setIdeias]       = useState<Ideia[]>([])
  const [userName, setUserName]   = useState('')
  const [expandedM, setExpandedM] = useState<string|null>(null)
  const [mFilter, setMFilter]     = useState('all')
  const [loading, setLoading]     = useState(true)

  const load = useCallback(async()=>{
    const {data:{user}} = await supabase.auth.getUser()
    if(!user) return
    setUserName(user.email?.split('@')[0]??'')
    const {data:u} = await supabase.from('usuarios').select('empresa_id').eq('id',user.id).maybeSingle()
    const eid = u?.empresa_id??user.id
    const {data:sess} = await supabase.auth.getSession()
    const token = sess.session?.access_token

    const [mRes,uRes,cRes,pRes,iRes] = await Promise.all([
      fetch('/api/hub/missions-list',{headers:token?{Authorization:`Bearer ${token}`}:{}}),
      supabase.from('hub_uso_agentes').select('agente_id,modelo,total_tokens,custo_usd,created_at').eq('empresa_id',eid).order('created_at',{ascending:false}).limit(100),
      supabase.from('hub_cerebro').select('*').eq('empresa_id',eid).maybeSingle(),
      supabase.from('hub_projetos').select('id,nome,status,progresso,categoria').eq('empresa_id',eid).order('created_at',{ascending:false}).limit(10),
      supabase.from('hub_ideias').select('id,status').eq('empresa_id',eid),
    ])

    if(mRes.ok){const d=await mRes.json() as {missions?:Mission[]};setMissions(d.missions??[])}
    setUsage(uRes.data??[])
    setCerebro(cRes.data as CerebroRow|null)
    setProjetos(pRes.data??[])
    setIdeias(iRes.data??[])
    setLoading(false)
  },[])

  useEffect(()=>{void load()},[load])

  // ── Derived ──
  const now = Date.now()
  const todayStart = new Date(); todayStart.setHours(0,0,0,0)

  const activeMissions = missions.filter(m=>m.status==='running')
  const todayMissions  = missions.filter(m=>new Date(m.created_at)>=todayStart)
  const approvedMissions = missions.filter(m=>m.status==='approved')
  const todayCost  = usage.filter(u=>new Date(u.created_at)>=todayStart).reduce((s,u)=>s+Number(u.custo_usd??0),0)
  const totalCost  = usage.reduce((s,u)=>s+Number(u.custo_usd??0),0)
  const agentsNow  = new Set(activeMissions.flatMap(m=>m.agents_used??[])).size
  const hoursElapsed = new Date().getHours()+1
  const projMes = (todayCost/hoursElapsed)*24*30

  const cerebroPct = cerebro
    ? Math.round(CEREBRO_FIELDS.filter(f=>cerebro[f.key]&&String(cerebro[f.key]).trim()).length/CEREBRO_FIELDS.length*100)
    : 0

  // Agent counts
  const agentCounts:Record<string,number> = {}
  const agentCost:Record<string,number> = {}
  missions.forEach(m=>(m.agents_used??[]).forEach(id=>{agentCounts[id]=(agentCounts[id]??0)+1}))
  usage.forEach(u=>{agentCost[u.agente_id]=(agentCost[u.agente_id]??0)+Number(u.custo_usd??0)})

  const agentBarData = Object.entries(agentCounts)
    .sort((a,b)=>b[1]-a[1]).slice(0,12)
    .map(([id,count])=>({name:id,count,cost:Number((agentCost[id]??0).toFixed(5)),color:'#3ecf8e'}))

  // Cost charts
  const costBy30 = Array.from({length:30},(_,i)=>{
    const d = new Date(now-(29-i)*86400000)
    const key = d.toISOString().slice(0,10)
    const sonnet = usage.filter(u=>u.created_at.slice(0,10)===key&&u.modelo?.includes('sonnet')).reduce((s,u)=>s+Number(u.custo_usd??0),0)
    const haiku  = usage.filter(u=>u.created_at.slice(0,10)===key&&!u.modelo?.includes('sonnet')).reduce((s,u)=>s+Number(u.custo_usd??0),0)
    return {date:fmtDate(d.toISOString()),sonnet:+sonnet.toFixed(5),haiku:+haiku.toFixed(5)}
  })

  const modelBreakdown = [
    {name:'Sonnet (C1)',value:usage.filter(u=>u.modelo?.includes('sonnet')).reduce((s,u)=>s+Number(u.custo_usd??0),0),color:'#eab308'},
    {name:'Haiku',value:usage.filter(u=>!u.modelo?.includes('sonnet')).reduce((s,u)=>s+Number(u.custo_usd??0),0),color:'#3ecf8e'},
  ]

  // Hourly
  const hourlyData = Array.from({length:24},(_,h)=>({
    hora:`${String(h).padStart(2,'0')}h`,
    ações:usage.filter(u=>{const d=new Date(u.created_at);const diff=(now-d.getTime())/3600000;return diff>=0&&diff<24&&d.getHours()===h}).length,
  }))

  // Heatmap
  const heatGrid = buildHeatmap(missions)
  const heatMax = Math.max(...heatGrid.flat(),1)

  // Filtered missions
  const filteredM = mFilter==='all' ? missions : missions.filter(m=>m.status===mFilter)

  // Ideas by status
  const ideiasStatus = ['nova','aprovada','desenvolvendo','concluida','rejeitada'].map(s=>({
    s, count:ideias.filter(i=>i.status===s).length,
    color:{nova:'#3ecf8e',aprovada:'#84cc16',desenvolvendo:'#a3a3a3',concluida:'#22c55e',rejeitada:'#f44'}[s]??'#555',
  }))

  // Agent × Project mapping
  const agentProjectMap: Record<string, string[]> = {}
  const projectKeywords: Record<string, string[]> = {
    'FactorOne': ['factorone','finance os','financeiro','pme'],
    'LifeOS': ['lifeos','life os','pessoal'],
    'VN Prime': ['vn prime','vnprime','imóvel','imobili'],
    'FactorHub': ['factorhub','agente','missão','squad'],
  }
  missions.forEach(m=>{
    const title = m.title?.toLowerCase()??''
    Object.entries(projectKeywords).forEach(([proj,kw])=>{
      if(kw.some(k=>title.includes(k))){
        ;(m.agents_used??[]).forEach(aid=>{
          if(!agentProjectMap[aid]) agentProjectMap[aid]=[]
          if(!agentProjectMap[aid].includes(proj)) agentProjectMap[aid].push(proj)
        })
      }
    })
  })

  const kpis = [
    {label:'Missões ativas', value:activeMissions.length, sub:`${missions.length} total · ${approvedMissions.length} aprovadas`, icon:'fa-rocket', color:'#3ecf8e', href:'/dashboard/missoes',
     sparkData:Array.from({length:7},(_,i)=>missions.filter(m=>new Date(m.created_at).toDateString()===new Date(now-i*86400000).toDateString()).length).reverse()},
    {label:'Hoje', value:todayMissions.length, sub:`${agentsNow} agentes ativos agora`, icon:'fa-calendar-day', color:'#3ecf8e', href:'/dashboard/missoes'},
    {label:'Agentes', value:27, sub:`${agentsNow} em execução · 27 disponíveis`, icon:'fa-robot', color:'#3ecf8e', href:'/dashboard/agentes'},
    {label:'Custo hoje', value:fmtMoney(todayCost), sub:`proj. mês ${fmtMoney(projMes)} · total ${fmtMoney(totalCost)}`, icon:'fa-coins', color:'#3ecf8e', href:'/dashboard/uso',
     sparkData:costBy30.slice(-7).map(d=>d.sonnet+d.haiku)},
    {label:'Cérebro', value:`${cerebroPct}%`, sub:`${CEREBRO_FIELDS.filter(f=>cerebro?.[f.key]).length}/${CEREBRO_FIELDS.length} campos preenchidos`, icon:'fa-brain', color:cerebroPct<40?'#f44':cerebroPct<70?'#f59e0b':'#3ecf8e', href:'/dashboard/cerebro'},
  ]

  return (
    <div style={{display:'flex',flexDirection:'column',gap:14}}>

      {/* ── Header ── */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <div style={{fontSize:17,fontWeight:700,color:'var(--text)',letterSpacing:'-.3px'}}>
            {userName ? <>Olá, <span style={{color:'var(--accent)'}}>{userName}</span></> : 'FactorHub OS'}
          </div>
          <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>
            {new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'})}
            {' · '}
            <span style={{color:cerebroPct<40?'#f44':cerebroPct<70?'#f59e0b':'var(--accent)'}}>Cérebro {cerebroPct}%</span>
          </div>
        </div>
        {/* Quick actions */}
        <div style={{display:'flex',gap:6}}>
          {[
            {label:'Nova Missão', icon:'fa-rocket', href:'/dashboard/missoes', primary:true},
            {label:'Nova Ideia', icon:'fa-lightbulb', href:'/dashboard/ideias', primary:false},
            {label:'Chat', icon:'fa-comment-dots', href:'/dashboard/chat', primary:false},
            {label:'Live', icon:'fa-display', href:'/live-monitor.html', primary:false, external:true},
          ].map(a=>(
            a.external
              ? <a key={a.label} href={a.href} target="_blank" rel="noreferrer" style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',borderRadius:6,background:'var(--surface-2)',border:'1px solid var(--border)',color:'var(--text-muted)',textDecoration:'none',fontSize:11,fontWeight:600}}>
                  <i className={`fa-solid ${a.icon}`} style={{fontSize:9}}/>{a.label}
                </a>
              : <Link key={a.label} href={a.href} style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',borderRadius:6,background:a.primary?'var(--accent)':'var(--surface-2)',border:a.primary?'none':'1px solid var(--border)',color:a.primary?'#101010':'var(--text-muted)',textDecoration:'none',fontSize:11,fontWeight:700}}>
                  <i className={`fa-solid ${a.icon}`} style={{fontSize:9}}/>{a.label}
                </Link>
          ))}
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <motion.div
        initial="hidden" animate="show"
        variants={{show:{transition:{staggerChildren:0.06}}}}
        style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10}}
      >
        {kpis.map(k=><KpiCard key={k.label} {...k}/>)}
      </motion.div>

      {/* ── Row 2: Missions + Agent Activity ── */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 340px',gap:12}}>

        {/* Missions table */}
        <div style={card}>
          <SectionHeader
            title="Missões"
            sub={`${filteredM.length} exibidas`}
            action={{label:'Ver todas',href:'/dashboard/missoes'}}
          />
          <div style={{display:'flex',gap:4,padding:'8px 16px',borderBottom:'1px solid var(--border)'}}>
            {[['all','Todas'],['running','Ativas'],['approved','Aprovadas'],['archived','Arquivadas'],['error','Erros']].map(([v,l])=>(
              <button key={v} onClick={()=>setMFilter(v)} style={{padding:'2px 9px',borderRadius:4,border:`1px solid ${mFilter===v?'var(--accent)':'var(--border)'}`,background:mFilter===v?'var(--accent-dim)':'transparent',color:mFilter===v?'var(--accent)':'var(--text-muted)',fontSize:9,fontWeight:600,cursor:'pointer',transition:'all .12s'}}>
                {l}
              </button>
            ))}
          </div>
          <div style={{maxHeight:340,overflowY:'auto'}}>
            {loading ? (
              <div style={{padding:20,display:'flex',flexDirection:'column',gap:8}}>
                {[1,2,3].map(i=><div key={i} className="shimmer" style={{height:42,borderRadius:6}}/>)}
              </div>
            ) : filteredM.length===0 ? (
              <div style={{padding:'36px 20px',textAlign:'center',color:'var(--text-dim)',fontSize:12}}>
                {mFilter==='all'?'Nenhuma missão ainda.':'Nenhuma missão com este status.'}
              </div>
            ) : filteredM.map(m=>{
              const sc=S_COLOR[m.status]??'#555'
              const isExp=expandedM===m.id
              return (
                <div key={m.id} style={{borderBottom:'1px solid var(--border)'}}>
                  <button
                    onClick={()=>setExpandedM(isExp?null:m.id)}
                    style={{width:'100%',background:isExp?'var(--surface-2)':'transparent',border:'none',cursor:'pointer',textAlign:'left',padding:'10px 16px',display:'flex',alignItems:'center',gap:10,transition:'background .1s'}}
                  >
                    <div style={{width:28,height:28,borderRadius:6,background:`${sc}14`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:8,fontWeight:800,color:sc,flexShrink:0}}>{m.level}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:11,fontWeight:500,color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.title}</div>
                      <div style={{fontSize:9,color:'var(--text-muted)',marginTop:1}}>
                        {(m.agents_used??[]).length} agentes · {(m.total_tokens??0).toLocaleString()} tk · {m.cost_usd>0?fmtMoney(Number(m.cost_usd)):'—'}
                      </div>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:7,flexShrink:0}}>
                      <span style={{fontSize:9,color:'var(--text-dim)'}}>{timeAgo(m.created_at)}</span>
                      <span style={{fontSize:9,fontWeight:700,padding:'2px 7px',borderRadius:4,background:`${sc}12`,color:sc}}>{S_LABEL[m.status]??m.status}</span>
                    </div>
                    <i className={`fa-solid fa-chevron-${isExp?'up':'down'}`} style={{fontSize:8,color:'var(--text-dim)',flexShrink:0}}/>
                  </button>
                  <AnimatePresence>
                    {isExp&&(
                      <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} transition={{duration:.16}} style={{overflow:'hidden'}}>
                        <div style={{padding:'8px 16px 12px 54px'}}>
                          <div style={{display:'flex',flexWrap:'wrap',gap:4,marginBottom:6}}>
                            {(m.agents_used??[]).map(aid=>{
                              const a=AGENTS_V2[aid];if(!a)return null
                              return(
                                <button key={aid} onClick={()=>router.push('/dashboard/agentes')} style={{fontSize:9,fontWeight:700,padding:'2px 7px',borderRadius:4,background:'var(--surface-2)',color:'var(--text-muted)',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'inherit'}}>
                                  {a.initial} {a.name.split(' ')[0]}
                                </button>
                              )
                            })}
                          </div>
                          <button onClick={()=>router.push('/dashboard/missoes')} style={{fontSize:9,color:'var(--accent)',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',padding:0}}>
                            Abrir missão completa →
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        </div>

        {/* Agent Activity bar */}
        <div style={card}>
          <SectionHeader title="Atividade por Agente" sub="missões totais" action={{label:'Squad',href:'/dashboard/agentes'}}/>
          <div style={{padding:'12px 14px'}}>
            {agentBarData.length===0 ? (
              <div style={{height:200,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text-dim)',fontSize:12}}>Nenhuma missão ainda</div>
            ):(
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={agentBarData} layout="vertical" margin={{top:0,right:8,bottom:0,left:0}} onClick={()=>router.push('/dashboard/agentes')}>
                  <CartesianGrid horizontal={false} stroke="var(--border)"/>
                  <XAxis type="number" tick={{fontSize:9,fill:'var(--text-muted)'}} axisLine={false} tickLine={false}/>
                  <YAxis type="category" dataKey="name" tick={{fontSize:9,fill:'var(--text-muted)'}} axisLine={false} tickLine={false} width={28}/>
                  <Tooltip content={<Tip/>} cursor={{fill:'var(--surface-2)'}}/>
                  <Bar dataKey="count" radius={[0,4,4,0]}>
                    {agentBarData.map((e,i)=><Cell key={i} fill={e.color}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ── Row 3: Agent × Project Matrix ── */}
      <div style={card}>
        <SectionHeader title="Agentes × Projetos" sub="quem trabalha em quê" action={{label:'Ver squad',href:'/dashboard/agentes'}}/>
        <div style={{padding:'12px 14px',overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
            <thead>
              <tr style={{borderBottom:'1px solid var(--border)'}}>
                {['Agente','Camada','Missões','Custo','Projetos','Status'].map(h=>(
                  <th key={h} style={{padding:'5px 10px',textAlign:'left',fontWeight:700,fontSize:9,color:'var(--text-muted)',letterSpacing:'.05em',textTransform:'uppercase',whiteSpace:'nowrap'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(agentCounts).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([id,count])=>{
                const a=AGENTS_V2[id]; if(!a) return null
                const projs=agentProjectMap[id]??[]
                const isActive=activeMissions.some(m=>(m.agents_used??[]).includes(id))
                return(
                  <tr key={id} style={{borderBottom:'1px solid var(--border)',cursor:'pointer'}} onClick={()=>router.push('/dashboard/agentes')}>
                    <td style={{padding:'9px 10px'}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div style={{width:26,height:26,borderRadius:7,background:'var(--surface-2)',border:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:8,fontWeight:800,color:'var(--text-muted)',flexShrink:0}}>{a.initial}</div>
                        <span style={{fontWeight:600,color:'var(--text)'}}>{a.name}</span>
                      </div>
                    </td>
                    <td style={{padding:'9px 10px'}}>
                      <span style={{fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:3,background:'var(--surface-2)',color:'var(--text-muted)'}}>{a.layer}</span>
                    </td>
                    <td style={{padding:'9px 10px',color:'var(--text-muted)',fontVariantNumeric:'tabular-nums'}}>{count}</td>
                    <td style={{padding:'9px 10px',fontVariantNumeric:'tabular-nums',color:'var(--text-muted)'}}>
                      {agentCost[id]?fmtMoney(agentCost[id]):'—'}
                    </td>
                    <td style={{padding:'9px 10px'}}>
                      <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                        {projs.length ? projs.map(p=>(
                          <span key={p} style={{fontSize:8.5,fontWeight:600,padding:'1px 6px',borderRadius:3,background:'var(--surface-2)',color:'var(--text-muted)',border:'1px solid var(--border)'}}>{p}</span>
                        )) : <span style={{fontSize:9,color:'var(--text-dim)'}}>—</span>}
                      </div>
                    </td>
                    <td style={{padding:'9px 10px'}}>
                      <div style={{display:'flex',alignItems:'center',gap:5}}>
                        <div style={{width:6,height:6,borderRadius:'50%',background:isActive?'#3ecf8e':'var(--border-light)',flexShrink:0}}/>
                        <span style={{fontSize:9,color:isActive?'#3ecf8e':'var(--text-dim)'}}>{isActive?'Ativo':'Online'}</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {Object.keys(agentCounts).length===0&&(
            <div style={{padding:'32px 0',textAlign:'center',color:'var(--text-dim)',fontSize:12}}>Rode uma missão para ver a atividade dos agentes.</div>
          )}
        </div>
      </div>

      {/* ── Row 4: Cost breakdown + Timeline + Heatmap ── */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 240px',gap:12}}>

        {/* Cost by model — 30 days */}
        <div style={card}>
          <SectionHeader title="Custo de IA" sub={`30 dias · total ${fmtMoney(totalCost)}`} action={{label:'Consumo',href:'/dashboard/uso'}}/>
          <div style={{padding:'12px 14px'}}>
            <div style={{display:'flex',gap:16,marginBottom:10}}>
              {modelBreakdown.map(m=>(
                <div key={m.name} style={{display:'flex',alignItems:'center',gap:5}}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:m.color}}/>
                  <span style={{fontSize:9,color:'var(--text-muted)'}}>{m.name}</span>
                  <span style={{fontSize:10,fontWeight:700,color:'var(--text)',fontVariantNumeric:'tabular-nums'}}>{fmtMoney(m.value)}</span>
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={100}>
              <AreaChart data={costBy30} margin={{top:4,right:0,bottom:0,left:0}}>
                <defs>
                  <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#eab308" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gH" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3ecf8e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3ecf8e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--border)"/>
                <XAxis dataKey="date" tick={{fontSize:7.5,fill:'var(--text-muted)'}} axisLine={false} tickLine={false} interval={7}/>
                <YAxis hide/>
                <Tooltip content={<Tip/>} cursor={{stroke:'var(--border)'}}/>
                <Area type="monotone" dataKey="sonnet" name="Sonnet" stroke="#eab308" strokeWidth={1.5} fill="url(#gS)" dot={false}/>
                <Area type="monotone" dataKey="haiku" name="Haiku" stroke="#3ecf8e" strokeWidth={1.5} fill="url(#gH)" dot={false}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Timeline 24h */}
        <div style={card}>
          <SectionHeader title="Timeline de Atividade" sub="ações por hora — 24h"/>
          <div style={{padding:'12px 14px'}}>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={hourlyData} margin={{top:4,right:0,bottom:0,left:0}}>
                <CartesianGrid vertical={false} stroke="var(--border)"/>
                <XAxis dataKey="hora" tick={{fontSize:7.5,fill:'var(--text-muted)'}} axisLine={false} tickLine={false} interval={5}/>
                <YAxis hide/>
                <Tooltip content={<Tip/>} cursor={{fill:'var(--surface-2)'}}/>
                <Bar dataKey="ações" fill="var(--accent)" radius={[2,2,0,0]} opacity={0.8}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Heatmap */}
        <div style={card}>
          <SectionHeader title="Heatmap" sub="dias × horários"/>
          <div style={{padding:'10px 14px'}}>
            <div style={{display:'flex',gap:6}}>
              <div style={{display:'flex',flexDirection:'column',justifyContent:'space-between',paddingBottom:18}}>
                {HOURS_LBL.map(h=><span key={h} style={{fontSize:8,color:'var(--text-dim)',lineHeight:1}}>{h}</span>)}
              </div>
              <div style={{flex:1}}>
                <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gridTemplateRows:'repeat(6,1fr)',gap:3,marginBottom:4}}>
                  {heatGrid.map((row,ri)=>row.map((val,ci)=>(
                    <div key={`${ri}-${ci}`} title={`${val}`} style={{aspectRatio:'1',borderRadius:3,background:heatColor(val,heatMax),transition:'background .2s'}}/>
                  )))}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3}}>
                  {DAYS.map(d=><span key={d} style={{fontSize:8,color:'var(--text-dim)',textAlign:'center'}}>{d.slice(0,1)}</span>)}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ── Row 5: Projects + Ideas ── */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 280px',gap:12}}>

        {/* Projects */}
        <div style={card}>
          <SectionHeader title="Projetos" sub={`${projetos.length} projeto${projetos.length!==1?'s':''}`} action={{label:'Ver todos',href:'/dashboard/projetos'}}/>
          <div style={{padding:'12px 14px',display:'flex',flexDirection:'column',gap:8}}>
            {projetos.length===0 ? (
              <div style={{padding:'24px 0',textAlign:'center',color:'var(--text-dim)',fontSize:12}}>
                Nenhum projeto ainda.{' '}
                <Link href="/dashboard/projetos" style={{color:'var(--accent)',textDecoration:'none'}}>Criar projeto →</Link>
              </div>
            ) : projetos.slice(0,6).map(p=>{
              const sc=PROJ_STATUS_COLOR[p.status]??'#555'
              const projAgents=Object.entries(agentProjectMap).filter(([,projs])=>projs.includes(p.nome)).map(([id])=>id).slice(0,5)
              return(
                <div key={p.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',borderRadius:7,background:'var(--surface-2)',border:'1px solid var(--border)',cursor:'pointer'}} onClick={()=>router.push('/dashboard/projetos')}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:5}}>
                      <span style={{fontSize:11,fontWeight:600,color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.nome}</span>
                      <span style={{fontSize:8.5,fontWeight:700,padding:'1px 6px',borderRadius:3,background:`${sc}14`,color:sc,flexShrink:0}}>{p.status}</span>
                    </div>
                    <div style={{height:3,background:'var(--surface-3)',borderRadius:2,overflow:'hidden',marginBottom:5}}>
                      <div style={{height:'100%',width:`${p.progresso}%`,background:sc,borderRadius:2,transition:'width .4s'}}/>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:5}}>
                      {projAgents.map(aid=>{const a=AGENTS_V2[aid];if(!a)return null;return(
                        <div key={aid} title={a.name} style={{width:18,height:18,borderRadius:5,background:'var(--surface-2)',border:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:7,fontWeight:800,color:'var(--text-muted)'}}>{a.initial}</div>
                      )})}
                      {projAgents.length===0&&<span style={{fontSize:9,color:'var(--text-dim)'}}>Sem agentes vinculados</span>}
                    </div>
                  </div>
                  <span style={{fontSize:10,color:'var(--text-dim)',flexShrink:0,fontVariantNumeric:'tabular-nums'}}>{p.progresso}%</span>
                </div>
              )
            })}
            <Link href="/dashboard/projetos" style={{fontSize:10,color:'var(--accent)',textDecoration:'none',padding:'6px 0',textAlign:'center',borderTop:'1px solid var(--border)',marginTop:4}}>
              + Novo Projeto
            </Link>
          </div>
        </div>

        {/* Ideas pipeline */}
        <div style={card}>
          <SectionHeader title="Ideias" sub={`${ideias.length} total`} action={{label:'Ver',href:'/dashboard/ideias'}}/>
          <div style={{padding:'12px 14px'}}>
            {ideias.length===0 ? (
              <div style={{padding:'20px 0',textAlign:'center',color:'var(--text-dim)',fontSize:12}}>
                <Link href="/dashboard/ideias" style={{color:'var(--accent)',textDecoration:'none'}}>Capturar primeira ideia →</Link>
              </div>
            ):(
              <>
                {/* Mini bar chart */}
                <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:14}}>
                  {ideiasStatus.filter(s=>s.count>0).map(s=>(
                    <div key={s.s} style={{display:'flex',alignItems:'center',gap:7}}>
                      <span style={{fontSize:9,color:'var(--text-muted)',width:72,textTransform:'capitalize'}}>{s.s}</span>
                      <div style={{flex:1,height:5,borderRadius:3,background:'var(--surface-3)',overflow:'hidden'}}>
                        <div style={{height:'100%',width:`${(s.count/ideias.length)*100}%`,background:s.color,borderRadius:3}}/>
                      </div>
                      <span style={{fontSize:9,color:'var(--text-muted)',fontVariantNumeric:'tabular-nums',width:14,textAlign:'right'}}>{s.count}</span>
                    </div>
                  ))}
                </div>
                <Link href="/dashboard/ideias" style={{display:'flex',alignItems:'center',justifyContent:'center',gap:5,padding:'6px',borderRadius:6,background:'var(--surface-2)',border:'1px solid var(--border)',color:'var(--text-muted)',textDecoration:'none',fontSize:10,fontWeight:600}}>
                  <i className="fa-solid fa-plus" style={{fontSize:8}}/>Nova Ideia
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Row 6: Recent agent usage ── */}
      <div style={card}>
        <SectionHeader
          title="Uso Recente de Agentes"
          sub={`${Math.min(usage.length,20)} interações`}
          action={{label:'Ver consumo',href:'/dashboard/uso'}}
        />
        <div style={{maxHeight:260,overflowY:'auto'}}>
          {usage.length===0?(
            <div style={{padding:'32px',textAlign:'center',color:'var(--text-dim)',fontSize:12}}>Nenhuma interação ainda</div>
          ):usage.slice(0,20).map((u,i)=>{
            const a=AGENTS_V2[u.agente_id]
            const isSonnet=u.modelo?.includes('sonnet')
            return(
              <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 16px',borderBottom:'1px solid var(--border)',transition:'background .1s'}} onClick={()=>router.push('/dashboard/agentes')}>
                <div style={{width:24,height:24,borderRadius:6,background:'var(--surface-2)',border:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:8,fontWeight:800,color:'var(--text-muted)',flexShrink:0}}>
                  {a?.initial??u.agente_id.slice(0,2)}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:11,fontWeight:600,color:'var(--text)'}}>{a?.name??u.agente_id}</div>
                  <div style={{fontSize:9,color:'var(--text-muted)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{u.modelo}</div>
                </div>
                <div style={{textAlign:'right',flexShrink:0}}>
                  <div style={{fontSize:10,color:'var(--text)',fontVariantNumeric:'tabular-nums'}}>{fmtMoney(Number(u.custo_usd))}</div>
                  <div style={{fontSize:9,color:'var(--text-muted)'}}>{(u.total_tokens??0).toLocaleString()} tk</div>
                </div>
                <div style={{fontSize:9,color:'var(--text-dim)',width:30,textAlign:'right',flexShrink:0}}>{timeAgo(u.created_at)}</div>
                <div style={{fontSize:8,fontWeight:700,padding:'2px 6px',borderRadius:3,background:isSonnet?'#eab30814':'#3ecf8e14',color:isSonnet?'#eab308':'#3ecf8e',flexShrink:0,minWidth:40,textAlign:'center'}}>
                  {isSonnet?'Sonnet':'Haiku'}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Row 7: Cérebro status ── */}
      <div style={card}>
        <SectionHeader title="Cérebro — Contexto dos Agentes" sub={`${cerebroPct}% completo`} action={{label:'Editar',href:'/dashboard/cerebro'}}/>
        <div style={{padding:'12px 16px'}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:8}}>
            {CEREBRO_FIELDS.map(f=>{
              const filled=!!(cerebro?.[f.key]&&String(cerebro[f.key]).trim())
              return(
                <Link key={f.key} href="/dashboard/cerebro" style={{textDecoration:'none'}}>
                  <div style={{display:'flex',alignItems:'center',gap:7,padding:'7px 10px',borderRadius:6,background:'var(--surface-2)',border:`1px solid ${filled?'rgba(62,207,142,.2)':'var(--border)'}`,cursor:'pointer',transition:'border-color .15s'}}>
                    <i className={`fa-solid ${filled?'fa-check-circle':'fa-circle-dot'}`} style={{fontSize:11,color:filled?'#3ecf8e':'var(--text-dim)',flexShrink:0}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:10,fontWeight:600,color:filled?'var(--text)':'var(--text-dim)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{f.label}</div>
                      {filled&&cerebro?.[f.key]&&(
                        <div style={{fontSize:8.5,color:'var(--text-muted)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginTop:1}}>
                          {String(cerebro[f.key]).slice(0,35)}{String(cerebro[f.key]).length>35?'…':''}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </div>

    </div>
  )
}
