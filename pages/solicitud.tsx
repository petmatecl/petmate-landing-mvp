import React from 'react'
import Head from 'next/head'

// Utilidad: formatear fecha dd/mm/yyyy
function fmt(d?: Date | null) {
  if (!d) return ''
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

function addMonths(d: Date, n: number) {
  const x = new Date(d)
  x.setMonth(d.getMonth() + n)
  x.setDate(1)
  return x
}

// Genera la matriz del mes (6 filas x 7 días)
function buildMonthMatrix(viewDate: Date) {
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const first = new Date(year, month, 1)
  const startDay = (first.getDay() + 6) % 7 // Lunes=0
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells: { date: Date; inMonth: boolean }[] = []

  // Días previos para completar la primera semana
  for (let i = 0; i < startDay; i++) {
    const d = new Date(year, month, -i)
    cells.unshift({ date: d, inMonth: false })
  }
  // Días del mes
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), inMonth: true })
  }
  // Completa hasta 6 semanas
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date
    const next = new Date(last)
    next.setDate(last.getDate() + 1)
    cells.push({ date: next, inMonth: false })
  }
  while (cells.length < 42) {
    const last = cells[cells.length - 1].date
    const next = new Date(last)
    next.setDate(last.getDate() + 1)
    cells.push({ date: next, inMonth: false })
  }
  return cells
}

// Iconos mono (SVG inline)
const IconHouse = (props: any) => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
    <path d="M3 10.5 12 3l9 7.5"/>
    <path d="M5 10v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9"/>
    <rect x="10" y="14" width="4" height="7" rx="1"/>
  </svg>
)
const IconBuilding = (props: any) => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
    <rect x="4" y="3" width="16" height="18" rx="2"/>
    <path d="M4 8h16M8 12h2M14 12h2M8 16h2M14 16h2"/>
  </svg>
)
const IconPaw = (props: any) => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden fill="currentColor" {...props}>
    <circle cx="7" cy="7" r="2.6"/>
    <circle cx="17" cy="7" r="2.6"/>
    <circle cx="5.5" cy="12.5" r="2.2"/>
    <circle cx="18.5" cy="12.5" r="2.2"/>
    <path d="M12 11c-3.5 0-6 2.5-6 4.8 0 2 1.7 3.2 6 3.2s6-1.2 6-3.2C18 13.5 15.5 11 12 11z"/>
  </svg>
)
const IconCat = (props: any) => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
    <path d="M4 20c0-6 4-9 8-9s8 3 8 9"/>
    <path d="M8 8V4l3 2 1-2 4 3v1"/>
    <circle cx="10" cy="12" r=".8"/>
    <circle cx="14" cy="12" r=".8"/>
  </svg>
)

export default function SolicitudPage() {
  // Estados de rango
  const [startDate, setStartDate] = React.useState<Date | null>(null)
  const [endDate, setEndDate] = React.useState<Date | null>(null)
  const [rangeError, setRangeError] = React.useState<string | null>(null)

  // Calendario emergente (dos meses)
  const [calendarOpen, setCalendarOpen] = React.useState(false)
  const [activeField, setActiveField] = React.useState<'start' | 'end'>('start')
  const [leftMonth, setLeftMonth] = React.useState(() => {
    const t = new Date()
    return new Date(t.getFullYear(), t.getMonth(), 1)
  })
  const rightMonth = React.useMemo(() => addMonths(leftMonth, 1), [leftMonth])

  const minDate = React.useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const leftCells = React.useMemo(() => buildMonthMatrix(leftMonth), [leftMonth])
  const rightCells = React.useMemo(() => buildMonthMatrix(rightMonth), [rightMonth])
  const isSameDay = (a?: Date | null, b?: Date | null) => !!a && !!b && a.toDateString() === b.toDateString()
  const isBetween = (d: Date) => (startDate && endDate ? d >= startDate && d <= endDate : false)

  function openFor(field: 'start' | 'end') {
    setActiveField(field)
    setRangeError(null)
    setCalendarOpen(true)
  }

  function selectDay(d: Date) {
    if (d < minDate) return
    setRangeError(null)

    if (activeField === 'start') {
      setStartDate(d)
      if (endDate && endDate < d) setEndDate(null)
      setActiveField('end')
      return
    }

    // activeField === 'end'
    if (startDate && d < startDate) {
      setRangeError('La fecha de fin no puede ser menor que la de inicio.')
      return
    }
    if (!startDate) {
      // Si no hay inicio y el usuario abre el fin primero, forzamos a elegir inicio
      setRangeError('Primero selecciona la fecha de inicio.')
      setActiveField('start')
      return
    }
    setEndDate(d)
    setCalendarOpen(false)
  }

  function monthAdd(n: number) {
    setLeftMonth(addMonths(leftMonth, n))
  }

  function clearDates() {
    setStartDate(null); setEndDate(null); setRangeError(null); setActiveField('start')
  }

  function Month({ labelDate, cells }: { labelDate: Date; cells: { date: Date; inMonth: boolean }[] }) {
    return (
      <div className="month">
        <div className="monthLabel">{labelDate.toLocaleString('es', { month: 'long', year: 'numeric' })}</div>
        <div className="weekRow head">
          {['LU','MA','MI','JU','VI','SÁ','DO'].map((d) => (
            <div key={d} className="cell head">{d}</div>
          ))}
        </div>
        <div className="grid">
          {cells.map(({ date, inMonth }, i) => {
            const disabled = date < minDate || !inMonth
            const isStart = isSameDay(date, startDate)
            const isEnd = isSameDay(date, endDate)
            const inRange = isBetween(date)
            return (
              <button
                key={i}
                className={[
                  'cell',
                  inMonth ? '' : 'muted',
                  disabled ? 'disabled' : '',
                  isStart ? 'start' : '',
                  isEnd ? 'end' : '',
                  inRange ? 'inrange' : '',
                ].join(' ')}
                onClick={() => !disabled && selectDay(new Date(date))}
                disabled={disabled}
              >
                {date.getDate()}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <>
      <Head><title>Solicitud — PetMate</title></Head>

      <main className="page">
        <h1 className="h1">Solicitud</h1>

        {/* Rango de fechas */}
        <section className="card">
          <h2 className="h2">Fechas del viaje</h2>
          <div className="dateRow">
            <div className="field">
              <label>Inicio</label>
              <input
                readOnly
                value={fmt(startDate)}
                placeholder="dd/mm/aaaa"
                onClick={() => openFor('start')}
              />
            </div>
            <div className="field">
              <label>Fin</label>
              <input
                readOnly
                value={fmt(endDate)}
                placeholder="dd/mm/aaaa"
                onClick={() => openFor('end')}
              />
            </div>
            <button className="btnGhost" onClick={clearDates}>Limpiar</button>
          </div>
          {rangeError && <p className="error" role="alert">{rangeError}</p>}

          {calendarOpen && (
            <div className="overlay" role="dialog" aria-modal>
              <div className="cal">
                <button className="close" aria-label="Cerrar" onClick={() => setCalendarOpen(false)}>×</button>

                <div className="calHead">
                  <button className="nav" onClick={() => monthAdd(-1)}>‹</button>
                  <div className="monthRange">
                    <strong>{leftMonth.toLocaleString('es', { month: 'long', year: 'numeric' })}</strong>
                    <span className="dash">—</span>
                    <strong>{rightMonth.toLocaleString('es', { month: 'long', year: 'numeric' })}</strong>
                  </div>
                  <button className="nav" onClick={() => monthAdd(1)}>›</button>
                </div>

                <div className="months">
                  <Month labelDate={leftMonth} cells={leftCells} />
                  <Month labelDate={rightMonth} cells={rightCells} />
                </div>

                <div className="legend">
                  <span className="dot start"/> Inicio
                  <span className="sep"/>
                  <span className="dot end"/> Fin
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Tipo de propiedad */}
        <section className="card">
          <h2 className="h2">Tipo de propiedad</h2>
          <div className="options">
            <label className="opt">
              <input type="radio" name="property" defaultChecked />
              <span className="ico"><IconHouse/></span>
              <span>Casa</span>
            </label>
            <label className="opt">
              <input type="radio" name="property" />
              <span className="ico"><IconBuilding/></span>
              <span>Departamento</span>
            </label>
          </div>
        </section>

        {/* Mascotas */}
        <section className="card">
          <h2 className="h2">Mascotas</h2>
          <div className="options">
            <label className="opt">
              <input type="checkbox" name="dogs" />
              <span className="ico"><IconPaw/></span>
              <span>Perros</span>
            </label>
            <label className="opt">
              <input type="checkbox" name="cats" />
              <span className="ico"><IconCat/></span>
              <span>Gatos</span>
            </label>
          </div>
        </section>

        <div className="actions">
          <button className="btnPrimary">Continuar</button>
        </div>
      </main>

      <style jsx>{`
        :global(body){background:#fff}
        .page{max-width:1040px;margin:0 auto;padding:24px 16px}
        .h1{font-size:1.8rem;margin:0 0 12px;}
        .h2{font-size:1.2rem;margin:0 0 12px}
        .card{border:1px solid #e5e7eb;border-radius:14px;padding:16px;margin:16px 0;background:#fff}

        .dateRow{display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap}
        .field{display:grid;gap:6px}
        label{font-weight:600}
        input{height:42px;padding:0 12px;border:1px solid #e5e7eb;border-radius:8px;width:220px}
        input:focus{outline:none;border-color:#111827;box-shadow:0 0 0 3px rgba(17,24,39,.08)}
        .btnGhost{height:42px;padding:0 14px;border-radius:10px;border:1px solid #e5e7eb;background:#fff;cursor:pointer}
        .error{color:#b91c1c;margin-top:8px}

        .overlay{position:fixed;inset:0;background:rgba(0,0,0,.28);display:flex;align-items:center;justify-content:center;z-index:50}
        .cal{position:relative;width:min(820px,95vw);background:#fff;border-radius:14px;border:1px solid #e5e7eb;box-shadow:0 12px 30px rgba(0,0,0,.15);padding:12px}
        .close{position:absolute;top:8px;right:10px;border:none;background:transparent;font-size:28px;line-height:1;cursor:pointer}
        .calHead{display:flex;align-items:center;justify-content:space-between;padding:6px 0 10px}
        .nav{width:36px;height:36px;border-radius:8px;border:1px solid #e5e7eb;background:#fff;cursor:pointer}
        .monthRange{display:flex;align-items:center;gap:10px;text-transform:capitalize;font-weight:700}
        .dash{opacity:.5}
        .months{display:grid;grid-template-columns:1fr 1fr;gap:16px}

        .monthLabel{font-weight:700;text-transform:capitalize;margin-bottom:6px}
        .weekRow{display:grid;grid-template-columns:repeat(7,1fr);gap:6px}
        .grid{display:grid;grid-template-columns:repeat(7,1fr);gap:6px}
        .cell{height:40px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer}
        .cell.head{border:none;background:transparent;font-weight:700;color:#6b7280}
        .cell.muted{color:#9ca3af;background:#fafafa}
        .cell.disabled{opacity:.45;cursor:not-allowed}
        .cell.start,.cell.end{background:#111827;color:#fff;border-color:#111827}
        .cell.inrange{background:#e5e7eb}
        .legend{display:flex;gap:12px;align-items:center;justify-content:center;margin-top:8px;color:#6b7280}
        .dot{display:inline-block;width:10px;height:10px;border-radius:999px;margin-right:4px}
        .dot.start{background:#111827}
        .dot.end{background:#111827}

        .options{display:flex;gap:16px;flex-wrap:wrap}
        .opt{display:flex;align-items:center;gap:8px;border:1px solid #e5e7eb;border-radius:12px;padding:10px 12px;cursor:pointer}
        .opt input{margin-right:2px;width:16px;height:16px}
        .ico{display:inline-flex;color:#111827}

        .actions{display:flex;justify-content:flex-end;margin-top:12px}
        .btnPrimary{height:44px;padding:0 18px;border-radius:10px;font-weight:700;background:#111827;color:#fff;border:none;cursor:pointer}
      `}</style>
    </>
  )
}
