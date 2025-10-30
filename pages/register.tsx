// pages/register.tsx
import React from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import type { DateRange } from 'react-day-picker'
import DateRangeAirbnb from '../components/DateRangeAirbnb'

type Role = 'cliente' | 'petmate'

const DogIcon = (p:any)=>(
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}>
    <path d="M3 10l3-3h5l3 3v9H6a3 3 0 0 1-3-3v-6z"/><circle cx="15.5" cy="9.5" r="1"/><path d="M13 6l2-2h3l2 2v4M6 15h6"/>
  </svg>
)
const CatIcon = (p:any)=>(
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}>
    <path d="M4 20c0-6 4-9 8-9s8 3 8 9"/><path d="M8 8V4l3 2 1-2 4 3v1"/><circle cx="10" cy="12" r=".8"/><circle cx="14" cy="12" r=".8"/>
  </svg>
)
// Iconos para tipo de vivienda
const HouseIcon = (p:any)=>(
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}>
    <path d="M3 11.5l9-7 9 7"/><path d="M5 10v9h14v-9"/><path d="M10 19v-6h4v6"/>
  </svg>
)
const BuildingIcon = (p:any)=>(
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}>
    <rect x="4" y="3" width="10" height="18" rx="1"/><path d="M18 21V8h2a1 1 0 0 1 1 1v12z"/><path d="M7 7h4M7 11h4M7 15h4"/>
  </svg>
)

export default function RegisterPage(){
  const router = useRouter()
  const [tab, setTab] = React.useState<Role>('cliente')

  // Selección automática de tab según ?role=...
  React.useEffect(() => {
    if (!router.isReady) return
    const r = String(router.query.role || '').toLowerCase()
    if (['petmate','sitter'].includes(r)) setTab('petmate')
    else if (['cliente','client','owner'].includes(r)) setTab('cliente')
  }, [router.isReady, router.query.role])

  // --- Estado para el tab Cliente ---
  const [region, setRegion] = React.useState('RM')
  const [comuna, setComuna] = React.useState('')
  const [perros, setPerros] = React.useState(0)
  const [gatos, setGatos] = React.useState(0)
  const [pickerOpen, setPickerOpen] = React.useState(false)

  // NUEVO: tipo de vivienda y fechas
  const [tipoVivienda, setTipoVivienda] = React.useState<'casa'|'departamento'|''>('')
  const [rango, setRango] = React.useState<DateRange | undefined>(undefined)
  const [formError, setFormError] = React.useState<string|null>(null)

  const comunasOriente = ['Las Condes','Vitacura','Lo Barnechea','La Reina','Providencia','Ñuñoa']

  function resumenMascotas(){
    const p = perros>0 ? `${perros} perro${perros>1?'s':''}` : ''
    const g = gatos>0 ? `${gatos} gato${gatos>1?'s':''}` : ''
    return [p,g].filter(Boolean).join(', ') || 'Sin mascotas'
  }

  // --- submits ---
  function submitCliente(e:React.FormEvent){
    e.preventDefault()
    // Validaciones mínimas nuevas
    if (!tipoVivienda) { setFormError('Selecciona el tipo de vivienda.'); return }
    if (!rango?.from || !rango?.to) { setFormError('Selecciona las fechas de inicio y fin.'); return }
    setFormError(null)

    // TODO: enviar a API de clientes con tipoVivienda y fechas
    alert('Registro de cliente enviado (demo)')
  }
  function submitPetmate(e:React.FormEvent){
    e.preventDefault()
    // Soft signup → a onboarding privado
    router.push('/petmate/onboarding')
  }

  return (
    <>
      <Head><title>Registro — PetMate</title></Head>

      <main className="page">
        <div className="wrap">
          <div className="tabs" role="tablist" aria-label="Tipo de registro">
            <button className={`tab ${tab==='cliente'?'active':''}`} onClick={()=>setTab('cliente')}>Necesito un PetMate</button>
            <button className={`tab ${tab==='petmate'?'active':''}`} onClick={()=>setTab('petmate')}>Quiero ser PetMate</button>
          </div>

          <div className="card">
            {tab==='cliente' ? (
              <form className="grid" onSubmit={submitCliente}>
                <h1>Regístrate como cliente</h1>
                <p className="sub">Cuéntanos quién eres, cuántas mascotas tienes y cuándo viajas.</p>

                <div className="cols">
                  <div className="field">
                    <label>Nombre</label>
                    <input required placeholder="Tu nombre" />
                  </div>
                  <div className="field">
                    <label>Apellido paterno</label>
                    <input required placeholder="Apellido paterno" />
                  </div>
                  <div className="field">
                    <label>Apellido materno</label>
                    <input required placeholder="Apellido materno" />
                  </div>
                </div>

                <div className="field">
                  <label>Correo</label>
                  <input type="email" required placeholder="tu@correo.com" />
                </div>

                <div className="cols">
                  <div className="field">
                    <label>Región</label>
                    <select value={region} onChange={e=>setRegion(e.target.value)} required>
                      <option value="RM">Región Metropolitana</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>Comuna (sector oriente)</label>
                    <select value={comuna} onChange={e=>setComuna(e.target.value)} required>
                      <option value="" disabled>Selecciona tu comuna</option>
                      {comunasOriente.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                {/* NUEVO — Tipo de vivienda */}
                <div className="field">
                  <label>Tipo de vivienda</label>
                  <div className="segmented">
                    <button
                      type="button"
                      className={`option ${tipoVivienda==='casa'?'active':''}`}
                      onClick={()=>setTipoVivienda('casa')}
                    >
                      <span className="optionIcon"><HouseIcon/></span>
                      <span>Casa</span>
                    </button>
                    <button
                      type="button"
                      className={`option ${tipoVivienda==='departamento'?'active':''}`}
                      onClick={()=>setTipoVivienda('departamento')}
                    >
                      <span className="optionIcon"><BuildingIcon/></span>
                      <span>Departamento</span>
                    </button>
                  </div>
                </div>

                {/* NUEVO — Calendario estilo Airbnb */}
                <div className="field">
                  <label>Fechas del viaje</label>
                  <DateRangeAirbnb
                    value={rango}
                    onChange={setRango}
                    minDate={new Date()}
                  />
                  <div className="muted" style={{marginTop:8}}>
                    {rango?.from && rango?.to
                      ? <>Seleccionaste: <b>{rango.from.toLocaleDateString()}</b> — <b>{rango.to.toLocaleDateString()}</b></>
                      : <>Selecciona fecha de inicio y fin.</>
                    }
                  </div>
                </div>

                {/* Picker tipo Airbnb para mascotas */}
                <div className="field">
                  <label>Mascotas</label>
                  <button type="button" className="pickerBtn" onClick={()=>setPickerOpen(true)}>
                    {resumenMascotas()}
                  </button>

                  {pickerOpen && (
                    <div className="overlay" onClick={()=>setPickerOpen(false)}>
                      <div className="popover" onClick={(e)=>e.stopPropagation()}>
                        <Row icon={<DogIcon/>} title="Perros" value={perros}
                             onDec={()=>setPerros(v=>Math.max(0,v-1))}
                             onInc={()=>setPerros(v=>v+1)} />
                        <Row icon={<CatIcon/>} title="Gatos" value={gatos}
                             onDec={()=>setGatos(v=>Math.max(0,v-1))}
                             onInc={()=>setGatos(v=>v+1)} />
                        <div className="end">
                          <button type="button" className="btnGhost" onClick={()=>{setPerros(0); setGatos(0)}}>Vaciar</button>
                          <button type="button" className="btnPrimary" onClick={()=>setPickerOpen(false)}>Listo</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Error simple */}
                {formError && <p className="error">{formError}</p>}

                {/* Hidden para postear al backend cuando conectemos */}
                <input type="hidden" name="tipo_vivienda" value={tipoVivienda} />
                <input type="hidden" name="start_date" value={rango?.from ? rango.from.toISOString() : ''} />
                <input type="hidden" name="end_date" value={rango?.to ? rango.to.toISOString() : ''} />
                <input type="hidden" name="perros" value={String(perros)} />
                <input type="hidden" name="gatos" value={String(gatos)} />

                <button className="btnPrimary" type="submit">Crear cuenta</button>
                <p className="muted">¿Ya tienes cuenta? <Link className="a" href="/login">Inicia sesión</Link></p>
              </form>
            ) : (
              <form className="grid" onSubmit={submitPetmate}>
                <h1>Registro rápido de PetMate</h1>
                <p className="sub">Solo datos básicos. Completarás el resto en tu perfil privado.</p>

                <div className="cols">
                  <div className="field">
                    <label>Nombre</label>
                    <input required placeholder="Tu nombre" />
                  </div>
                  <div className="field">
                    <label>Ap. paterno</label>
                    <input required placeholder="Apellido paterno" />
                  </div>
                  <div className="field">
                    <label>Ap. materno</label>
                    <input required placeholder="Apellido materno" />
                  </div>
                </div>

                <div className="cols">
                  <div className="field">
                    <label>Correo</label>
                    <input type="email" required placeholder="tu@correo.com" />
                  </div>
                  <div className="field">
                    <label>Contraseña</label>
                    <input type="password" required placeholder="••••••••" />
                  </div>
                  <div className="field">
                    <label>Confirmar contraseña</label>
                    <input type="password" required placeholder="••••••••" />
                  </div>
                </div>

                <button className="btnPrimary" type="submit">Crear cuenta y continuar</button>
              </form>
            )}
          </div>
        </div>
      </main>

      <style jsx>{`
        :root{ --brand:#111827; --muted:#f6f7f9; --border:#e5e7eb; }
        .page{min-height:calc(100vh - 200px); display:flex; justify-content:center; padding:24px; background:linear-gradient(180deg,#fafafa,#fff)}
        .wrap{width:100%; max-width:920px}
        .tabs{display:grid; grid-template-columns:1fr 1fr; gap:8px; background:var(--muted); padding:6px; border:1px solid var(--border); border-radius:14px; margin-bottom:14px}
        .tab{appearance:none; border:0; padding:.9rem 1rem; border-radius:10px; background:transparent; font-weight:800; cursor:pointer; color:#6b7280}
        .tab.active{background:#fff; border:2px solid var(--brand); color:var(--brand); box-shadow:0 2px 10px rgba(0,0,0,.06)}
        .card{background:#fff; border:1px solid var(--border); border-radius:16px; padding:20px; box-shadow:0 10px 28px rgba(0,0,0,.06)}
        .grid{display:grid; gap:14px}
        .cols{display:grid; gap:12px}
        @media(min-width:920px){ .cols{grid-template-columns:1fr 1fr 1fr} }
        h1{margin:0}
        .sub{color:#6b7280; margin:-2px 0 8px}
        .field{display:grid; gap:6px}
        label{font-weight:700}
        input, select{height:44px; padding:0 12px; border:1.5px solid #cbd5e1; border-radius:10px}
        input:focus, select:focus{outline:none; border-color:var(--brand); box-shadow:0 0 0 3px rgba(17,24,39,.08)}

        .pickerBtn{height:44px; border:1.5px solid #cbd5e1; border-radius:10px; background:#fff; text-align:left; padding:0 12px}
        .overlay{position:fixed; inset:0; background:rgba(0,0,0,.25); display:flex; align-items:center; justify-content:center; z-index:60}
        .popover{width:min(420px,95vw); background:#fff; border:1px solid var(--border); border-radius:14px; box-shadow:0 20px 40px rgba(0,0,0,.2); padding:12px}
        .row{display:flex; align-items:center; justify-content:space-between; padding:10px 4px; border-bottom:1px solid #f1f5f9}
        .row:last-child{border-bottom:none}
        .rowL{display:flex; align-items:center; gap:10px}
        .rowTitle{font-weight:700}
        .stepper{display:flex; align-items:center; gap:8px}
        .btnStep{width:34px; height:34px; border-radius:999px; border:1px solid #d1d5db; background:#fff; font-weight:700; cursor:pointer}
        .count{min-width:20px; text-align:center}
        .end{display:flex; justify-content:flex-end; gap:10px; margin-top:10px}
        .btnPrimary{height:46px; border:none; border-radius:10px; background:var(--brand); color:#fff; font-weight:800; cursor:pointer}
        .btnGhost{height:40px; border:1px solid #e5e7eb; border-radius:10px; background:#fff; padding:0 12px; font-weight:700}
        .muted{color:#6b7280}
        .a{text-decoration:underline; color:#111827}
        .error{color:#b91c1c; margin-top:4px}

        /* NUEVO: selector tipo de vivienda */
        .segmented{display:grid; grid-template-columns:1fr 1fr; gap:10px}
        .option{display:flex; align-items:center; gap:10px; height:48px; padding:0 12px; background:#fff; border:1.5px solid #cbd5e1; border-radius:12px; cursor:pointer}
        .optionIcon{width:36px; height:36px; border-radius:10px; background:#f1f5f9; display:flex; align-items:center; justify-content:center}
        .option.active{border-color:var(--brand); box-shadow:0 0 0 3px rgba(17,24,39,.08)}
      `}</style>
    </>
  )
}

function Row({icon,title,value,onDec,onInc}:{icon:React.ReactNode;title:string;value:number;onDec:()=>void;onInc:()=>void}){
  return (
    <div className="row">
      <div className="rowL">
        <span>{icon}</span>
        <div><div className="rowTitle">{title}</div></div>
      </div>
      <div className="stepper">
        <button type="button" className="btnStep" onClick={onDec} aria-label="disminuir">−</button>
        <span className="count">{value}</span>
        <button type="button" className="btnStep" onClick={onInc} aria-label="aumentar">+</button>
      </div>
    </div>
  )
}
