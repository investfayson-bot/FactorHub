'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/layout/PageHeader'

type Msg = { role: 'user' | 'assistant'; content: string }

const APP_URL = 'https://factor-hub.vercel.app'

export default function AtendimentoPage() {
  const [empresaId, setEmpresaId] = useState('')
  const [instrucoes, setInstrucoes] = useState('')
  const [msgs, setMsgs] = useState<Msg[]>([{ role: 'assistant', content: 'Olá! Sou o atendente virtual. Como posso ajudar?' }])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [copied, setCopied] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: u } = await supabase.from('usuarios').select('empresa_id').eq('id', user.id).maybeSingle()
      setEmpresaId(u?.empresa_id ?? user.id)
    })
  }, [])

  useEffect(() => { chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' }) }, [msgs, typing])

  async function enviar() {
    const t = input.trim()
    if (!t || typing || !empresaId) return
    setInput('')
    const next = [...msgs, { role: 'user' as const, content: t }]
    setMsgs(next)
    setTyping(true)
    setMsgs(m => [...m, { role: 'assistant', content: '' }])
    try {
      const res = await fetch('/api/atendimento', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresaId, instrucoes, messages: next }),
      })
      if (!res.ok || !res.body) throw new Error()
      const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = ''; let full = ''
      while (true) {
        const { done, value } = await reader.read(); if (done) break
        buf += dec.decode(value, { stream: true }); const lines = buf.split('\n'); buf = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim(); if (raw === '[DONE]') continue
          try { const tok = JSON.parse(raw).token as string; if (tok) { full += tok; setMsgs(m => { const n = [...m]; n[n.length - 1] = { role: 'assistant', content: full }; return n }) } } catch { /* skip */ }
        }
      }
    } catch { setMsgs(m => { const n = [...m]; n[n.length - 1] = { role: 'assistant', content: 'Erro ao responder.' }; return n }) }
    setTyping(false)
  }

  const embed = `<!-- FactorHub Atendimento 24/7 -->
<script>
(function(){
  var E="${empresaId}", U="${APP_URL}", I=${JSON.stringify(instrucoes || '')};
  var H=[], open=false;
  var btn=document.createElement('div');
  btn.innerHTML='💬';btn.style.cssText='position:fixed;bottom:20px;right:20px;width:56px;height:56px;border-radius:50%;background:#3ecf8e;color:#0a0a0a;font-size:24px;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 20px rgba(0,0,0,.3);z-index:99999';
  var box=document.createElement('div');
  box.style.cssText='position:fixed;bottom:88px;right:20px;width:340px;height:460px;background:#101010;border:1px solid #2e2e2e;border-radius:14px;display:none;flex-direction:column;overflow:hidden;z-index:99999;font-family:system-ui,sans-serif;box-shadow:0 10px 40px rgba(0,0,0,.5)';
  box.innerHTML='<div style="padding:14px;background:#181818;border-bottom:1px solid #2e2e2e;color:#ededed;font-weight:700;font-size:14px">Atendimento</div><div id="fh-msgs" style="flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px"></div><div style="padding:10px;border-top:1px solid #2e2e2e;display:flex;gap:6px"><input id="fh-in" placeholder="Digite..." style="flex:1;background:#1e1e1e;border:1px solid #2e2e2e;border-radius:8px;padding:8px 10px;color:#ededed;outline:none;font-size:13px"><button id="fh-send" style="background:#3ecf8e;border:none;border-radius:8px;width:38px;color:#0a0a0a;cursor:pointer;font-size:16px">→</button></div>';
  document.body.appendChild(btn);document.body.appendChild(box);
  function add(role,txt){var m=document.getElementById('fh-msgs');var d=document.createElement('div');d.style.cssText='max-width:85%;padding:8px 11px;border-radius:10px;font-size:13px;line-height:1.5;'+(role==='user'?'align-self:flex-end;background:#3ecf8e;color:#0a0a0a':'align-self:flex-start;background:#1e1e1e;color:#ededed');d.textContent=txt;m.appendChild(d);m.scrollTop=m.scrollHeight;return d}
  add('assistant','Olá! Como posso ajudar?');
  btn.onclick=function(){open=!open;box.style.display=open?'flex':'none'};
  async function send(){var inp=document.getElementById('fh-in');var t=inp.value.trim();if(!t)return;inp.value='';add('user',t);H.push({role:'user',content:t});var d=add('assistant','...');var full='';
    try{var r=await fetch(U+'/api/atendimento',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({empresaId:E,instrucoes:I,messages:H})});var rd=r.body.getReader();var dec=new TextDecoder();var bf='';
      while(true){var x=await rd.read();if(x.done)break;bf+=dec.decode(x.value,{stream:true});var ls=bf.split('\\n');bf=ls.pop();for(var i=0;i<ls.length;i++){var ln=ls[i];if(ln.indexOf('data: ')!==0)continue;var rw=ln.slice(6).trim();if(rw==='[DONE]')continue;try{var tk=JSON.parse(rw).token;if(tk){full+=tk;d.textContent=full}}catch(e){}}}
      H.push({role:'assistant',content:full})}catch(e){d.textContent='Erro.'}}
  document.getElementById('fh-send').onclick=send;
  document.getElementById('fh-in').onkeydown=function(e){if(e.key==='Enter')send()};
})();
</script>`

  function copiar() { navigator.clipboard.writeText(embed); setCopied(true); setTimeout(() => setCopied(false), 2000) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHeader title="Atendimento 24/7" subtitle="Chat com IA que atende seus clientes sozinho — embeda no site (VN Prime, etc.)" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 12 }}>
        {/* Config + embed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Instruções do atendente</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>Como ele deve atender. Ex: tom, o que oferecer, quando pedir contato.</div>
            <textarea value={instrucoes} onChange={e => setInstrucoes(e.target.value)} rows={4}
              placeholder="Ex: Seja consultivo, sempre ofereça agendar uma visita ao imóvel e peça nome + WhatsApp do interessado."
              style={{ width: '100%', resize: 'vertical', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: 'var(--text)', fontFamily: 'inherit', outline: 'none', lineHeight: 1.6, boxSizing: 'border-box' }} />
          </div>

          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>Código de instalação</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Cole antes do {'</body>'} no site do VN Prime — pronto, atende sozinho 24/7.</div>
              </div>
              <button onClick={copiar} style={{ fontSize: 11, fontWeight: 700, padding: '7px 14px', borderRadius: 7, background: copied ? '#3ecf8e' : 'var(--accent-dim)', color: copied ? '#0a0a0a' : 'var(--accent)', border: '1px solid var(--accent)', cursor: 'pointer', fontFamily: 'inherit' }}>
                <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'}`} style={{ fontSize: 10, marginRight: 5 }} />{copied ? 'Copiado!' : 'Copiar código'}
              </button>
            </div>
            <pre style={{ background: '#0a0a0a', border: '1px solid var(--border)', borderRadius: 8, padding: 12, fontSize: 10, color: '#9fe7c4', overflowX: 'auto', maxHeight: 200, fontFamily: 'monospace', lineHeight: 1.5 }}>{embed}</pre>
          </div>
        </div>

        {/* Live test */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', height: 480 }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>
            <i className="fa-solid fa-flask" style={{ fontSize: 10, color: 'var(--accent)', marginRight: 6 }} />Testar ao vivo
          </div>
          <div ref={chatRef} style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ maxWidth: '85%', alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', padding: '8px 11px', borderRadius: 10, fontSize: 12.5, lineHeight: 1.5, background: m.role === 'user' ? 'var(--accent)' : 'var(--surface-2)', color: m.role === 'user' ? '#0a0a0a' : 'var(--text)', border: m.role === 'user' ? 'none' : '1px solid var(--border)' }}>
                {m.content || (typing && i === msgs.length - 1 ? '...' : '')}
              </div>
            ))}
          </div>
          <div style={{ padding: 10, borderTop: '1px solid var(--border)', display: 'flex', gap: 6 }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void enviar() }} disabled={typing}
              placeholder="Teste como um cliente..." style={{ flex: 1, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', color: 'var(--text)', outline: 'none', fontSize: 13, fontFamily: 'inherit' }} />
            <button onClick={() => void enviar()} disabled={typing || !input.trim()} style={{ width: 36, borderRadius: 8, background: typing || !input.trim() ? 'var(--surface-3)' : 'var(--accent)', border: 'none', cursor: 'pointer', color: '#0a0a0a' }}>
              <i className="fa-solid fa-arrow-up" style={{ fontSize: 12 }} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
