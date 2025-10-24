// pages/solicitud.tsx
import React from 'react'
import Head from 'next/head'

function fmt(d?: Date | null) {
  if (!d) return ''
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}
const addMonths = (d:Date,n:number)=> new Date(d.getFullYear(), d.getMonth()+n, 1)

function buildMonthMatrix(anchor: Date){
  const y = anchor.getFullYear(), m = anchor.getMonth()
  const first = new Date(y, m, 1)
  const start = (first.getDay()+6)%7 // Lunes=0
  const total = new Date(y, m+1, 0).getDate()
  const cells: {date:Date,inMonth:boolean}[] = []
  for(let i=0;i<start;i++){ const d=new Date(y,m, -i); cells.unshift({date:d,inMonth:false}) }
  for(let d=1; d<=total; d++) cells.push({date:new Date(y,m,d), inMonth:true})
  while(cells.length%7!==0) { const last=cells[cells.length-1].date; const n=new Date(last); n.setDate(last.getDate()+1); cells.push({date:n,inMonth:false}) }
  while(cells.length<42) { const last=cells[cells.length-1].date; const n=new Date(last); n.setDate(last.getDate()+1); cells.push({date:n,inMonth:false}) }
  return cells
}

export default function SolicitudPage(){
  const [start, setStart] = React.useState<Date|null>(null)
  const [end, setEnd] = React.useState<Date|null>(null)
  const [err, setErr] = React.useState<string|null>(null)

  const [open, setOpen] = React.useState(false)
  const [left, setLeft] = React.useState(()=> new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const right = React.useMemo(()=> addMonths(left,1), [left])

  const minDate = React.useMemo(()=>{ const d=new Date(); d.setHours(0,0,0,0); return d }, [])
  const cellsL = React.useMemo(()=> buildMonthMatrix(left), [left])
  const cellsR = React.useMemo(()=> buildMonthMatrix(right), [right])

  const isSame = (a?:Date|null,b?:Date|null)=> !!a && !!b && a.toDateString()===b.toDateString()
  const between = (d:Date)=> start && end ? d>=start && d<=end : false

  function pick(d:Date){
    if(d<minDate) return
    setErr(null)
    if(!start || (start && end)) { setStart(d); setEnd(null); return }
    if(start && !end){
      if(d<start){ setErr('La fecha de fin no puede ser menor que la de inicio.'); return }
      setEnd(d); setOpen(false)
    }
  }

  return (
    <>
      <Head><title>Solicitud — PetMate</title></Head>

      <main style={{maxWidth:1040, margin:'0 auto', padding:'24px 16px'}}>
        <h1 style={{fontSize:'1.6rem', margin:'0 0 10px'}}>Solicitud</h1>

        <section style={{border:'1px solid #e5e7eb', borderRadius:14, padding:16, background:'#fff', margin:'16px 0'}}>
          <h2 style={{margin:'0 0 10px'}}>Fechas del viaje</h2>
          <div style={{display:'flex', gap:12, alignItems:'flex-end', flexWrap:'wrap'}}>
            <div style={{display:'grid', gap:6}}>
              <label>Inicio</label>
              <input readOnly placeholder="dd/mm/aaaa" value={fmt(start)} onClick={()=>setOpen(true)} style={inp}/>
            </div>
            <div style={{display:'grid', gap:6}}>
              <label>Fin</label>
              <input readOnly placeholder="dd/mm/aaaa" value={fmt(end)} onClick={()=>setOpen(true)} style={inp}/>
            </div>
            <button onClick={()=>{setStart(null); setEnd(null)}} style={btnGhost}>Limpiar</button>
          </div>
          {err && <p style={{color:'#b91c1c', marginTop:8}}>{err}</p>}

          {open && (
            <div onClick={()=>setOpen(false)} style={overlay}>
              <div onClick={(e)=>e.stopPropagation()} style={cal}>
                <button onClick={()=>setOpen(false)} aria-label="Cerrar" style={closeBtn}>×</button>

                {/* Header */}
                <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 0 10px'}}>
                  <button onClick={()=>setLeft(addMonths(left,-1))} style={navBtn}>‹</button>
                  <div style={{display:'flex', alignItems:'center', gap:12, fontWeight:800, textTransform:'capitalize'}}>
                    <span>{left.toLocaleString('es', {month:'long', year:'numeric'})}</span>
                    <span style={{opacity:.5}}>—</span>
                    <span>{right.toLocaleString('es', {month:'long', year:'numeric'})}</span>
                  </div>
                  <button onClick={()=>setLeft(addMonths(left,1))} style={navBtn}>›</button>
                </div>

                {/* Months */}
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
                  <Month labelDate={left}   cells={cellsL}  minDate={minDate} isSame={isSame} between={between} onPick={pick}/>
                  <Month labelDate={right}  cells={cellsR}  minDate={minDate} isSame={isSame} between={between} onPick={pick}/>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* El resto de tu formulario sigue aquí… */}
        <div style={{display:'flex', justifyContent:'flex-end', marginTop:12}}>
          <button style={btnPrimary}>Continuar</button>
        </div>
      </main>
    </>
  )
}

function Month({labelDate, cells, minDate, isSame, between, onPick}:{labelDate:Date; cells:{date:Date,inMonth:boolean}[]; minDate:Date; isSame:(a?:Date|null,b?:Date|null)=>boolean; between:(d:Date)=>boolean; onPick:(d:Date)=>void}){
  return (
    <div>
      <div style={{display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:6, marginBottom:6, color:'#6b7280', fontWeight:700}}>
        {['LU','MA','MI','JU','VI','SÁ','DO'].map(d=><div key={d} style={{textAlign:'center'}}>{d}</div>)}
      </div>
      <div style={{display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:6}}>
        {cells.map(({date,inMonth},i)=>{
          const disabled = date<minDate || !inMonth
          const start = (window as any).__start // solo para referencia visual si adaptas
          const end   = (window as any).__end
          const isStart = isSame(date, start)
          const isEnd   = isSame(date, end)
          const inRange = between(date)
          return (
            <button
              key={i}
              onClick={()=>!disabled && onPick(new Date(date))}
              disabled={disabled}
              style={{
                height:40, border:'1px solid #e5e7eb', borderRadius:8, background: disabled? '#fafafa' : inRange ? '#e5e7eb' : '#fff',
                color: !inMonth? '#9ca3af' : undefined, cursor: disabled? 'not-allowed':'pointer',
                ...(isStart||isEnd ? {background:'#111827', color:'#fff', borderColor:'#111827'} : {})
              }}
            >{date.getDate()}</button>
          )
        })}
      </div>
    </div>
  )
}

// estilos reutilizables
const inp      = {height:42, padding:'0 12px', border:'1.5px solid #cbd5e1', borderRadius:10} as React.CSSProperties
const btnGhost = {height:42, padding:'0 14px', borderRadius:10, border:'1px solid #e5e7eb', background:'#fff', cursor:'pointer'} as React.CSSProperties
const btnPrimary = {height:44, padding:'0 18px', borderRadius:10, fontWeight:800, background:'#111827', color:'#fff', border:'none', cursor:'pointer'} as React.CSSProperties
const overlay = {position:'fixed', inset:0 as any, background:'rgba(0,0,0,.28)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:60} as React.CSSProperties
const cal = {position:'relative', width:'min(820px,95vw)', background:'#fff', border:'1px solid #e5e7eb', borderRadius:14, boxShadow:'0 12px 30px rgba(0,0,0,.15)', padding:12} as React.CSSProperties
const closeBtn = {position:'absolute', top:8, right:10, border:'none', background:'transparent', fontSize:28, lineHeight:1, cursor:'pointer'} as React.CSSProperties
const navBtn = {width:36, height:36, borderRadius:8, border:'1px solid #e5e7eb', background:'#fff', cursor:'pointer'} as React.CSSProperties
