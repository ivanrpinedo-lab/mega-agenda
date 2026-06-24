import { useState, useCallback, useEffect } from 'react'
import { useStore } from './store/useStore'
import { Toast } from './components/UI'
import { EventForm } from './components/EventForm'
import { EventDetail } from './components/EventDetail'
import { Dashboard } from './pages/Dashboard'
import { Agenda } from './pages/Agenda'
import { WhatsApp } from './pages/WhatsApp'
import { Alertas } from './pages/Alertas'
import { Config } from './pages/Config'
import { requestNotificationPermission, fireNotification, daysUntil } from './utils/helpers'

const NAV = [
  { key: 'dashboard', label: 'Inicio',   icon: '🏠' },
  { key: 'agenda',    label: 'Agenda',   icon: '📅' },
  { key: 'whatsapp',  label: 'WhatsApp', icon: '💬' },
  { key: 'alertas',   label: 'Alertas',  icon: '🔔' },
  { key: 'config',    label: 'Config',   icon: '⚙️' },
]

export default function App() {
  const store = useStore()
  const [view, setView]           = useState('dashboard')
  const [toast, setToast]         = useState({ show: false, msg: '' })
  const [formOpen, setFormOpen]   = useState(false)
  const [editEvent, setEditEvent] = useState(null)
  const [detailEv, setDetailEv]   = useState(null)

  const showToast = useCallback((msg) => {
    setToast({ show: true, msg })
    setTimeout(() => setToast(t => ({ ...t, show: false })), 2500)
  }, [])

  useEffect(() => {
    requestNotificationPermission()
    const check = () => {
      store.events
        .filter(e => e.status !== 'completed' && e.alarm)
        .forEach(e => {
          const d = daysUntil(e.date)
          if (d <= (store.config.diasAnticipacion || 3) && d >= 0) fireNotification(e)
        })
    }
    check()
    const id = setInterval(check, 60000)
    return () => clearInterval(id)
  }, [])

  const handleSaveEvent = (ev) => {
    if (editEvent) { store.updateEvent(editEvent.id, ev); showToast('Evento actualizado') }
    else { store.addEvent(ev); showToast('Evento guardado') }
    setEditEvent(null)
  }

  const handleEdit = (ev) => { setEditEvent(ev); setFormOpen(true) }
  const handleEventClick = (ev) => setDetailEv(ev)
  const handleComplete = (id) => { store.completeEvent(id); showToast('Evento completado') }
  const handleDelete = (id) => { store.deleteEvent(id); showToast('Evento eliminado') }
  const handleReprogram = (id, newDate, note) => { store.reprogramEvent(id, newDate, note); showToast('Evento reprogramado') }

  const handleExport = () => {
    const { addEvent, updateEvent, deleteEvent, completeEvent, reprogramEvent, addNote, saveTemplate, deleteTemplate, updateConfig, addHistoryEntry, importData, clearData, ...data } = store
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'megaagenda_backup_' + new Date().toISOString().split('T')[0] + '.json'
    a.click()
    showToast('Exportado correctamente')
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = '.json'
    input.onchange = e => {
      const f = e.target.files[0]; if (!f) return
      const r = new FileReader()
      r.onload = ev => {
        try { store.importData(JSON.parse(ev.target.result)); showToast('Datos importados') }
        catch { showToast('Error al importar') }
      }
      r.readAsText(f)
    }
    input.click()
  }

  const handleClear = () => {
    if (!confirm('Eliminar TODOS los datos? Esta accion no se puede deshacer.')) return
    store.clearData(); showToast('Datos eliminados')
  }

  const overdueCount = store.events.filter(e => e.status !== 'completed' && daysUntil(e.date) < 0).length

  return (
    <>
      <header style={{
        background: 'var(--navy)', color: 'white', padding: '0 16px',
        height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 16px rgba(0,0,0,.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, background: 'var(--green)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13 }}>MS</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>MegaAgenda</div>
            <div style={{ fontSize: 10, opacity: 0.55, marginTop: -2 }}>Mega Sostenible SAC</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setView('alertas')} style={{ width: 36, height: 36, borderRadius: 8, border: 'none', background: 'rgba(255,255,255,.1)', color: 'white', cursor: 'pointer', fontSize: 16, position: 'relative' }}>
            🔔
            {overdueCount > 0 && <span style={{ position: 'absolute', top: 4, right: 4, background: 'var(--red)', width: 16, height: 16, borderRadius: '50%', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--navy)' }}>{overdueCount}</span>}
          </button>
          <button onClick={() => { setEditEvent(null); setFormOpen(true) }} style={{ width: 36, height: 36, borderRadius: 8, border: 'none', background: 'var(--green)', color: 'white', cursor: 'pointer', fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>＋</button>
        </div>
      </header>

      <main style={{ flex: 1, padding: '16px 16px 0', maxWidth: 680, margin: '0 auto', width: '100%' }}>
        {view === 'dashboard' && <Dashboard events={store.events} onEventClick={handleEventClick} onAddNew={() => { setEditEvent(null); setFormOpen(true) }} onGoAgenda={() => setView('agenda')} />}
        {view === 'agenda'    && <Agenda    events={store.events} onEventClick={handleEventClick} />}
        {view === 'whatsapp'  && <WhatsApp  events={store.events} templates={store.templates} history={store.history} config={store.config} onSaveTemplate={store.saveTemplate} onDeleteTemplate={store.deleteTemplate} onAddHistory={store.addHistoryEntry} />}
        {view === 'alertas'   && <Alertas   events={store.events} history={store.history} config={store.config} onComplete={handleComplete} onEventClick={handleEventClick} />}
        {view === 'config'    && <Config    config={store.config} onUpdateConfig={store.updateConfig} onExport={handleExport} onImport={handleImport} onClear={handleClear} />}
      </main>

      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--surface)', borderTop: '1px solid var(--border)', display: 'flex', zIndex: 100, boxShadow: '0 -4px 20px rgba(13,33,55,.08)' }}>
        {NAV.map(n => (
          <button key={n.key} onClick={() => setView(n.key)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 4px 12px', border: 'none', background: 'none', cursor: 'pointer', gap: 3, color: view === n.key ? 'var(--green)' : 'var(--text-light)', fontSize: 10, fontWeight: 500, fontFamily: 'inherit', transition: 'color .15s' }}>
            <span style={{ fontSize: 20, transform: view === n.key ? 'translateY(-1px)' : 'none', transition: 'transform .15s' }}>{n.icon}</span>
            {n.label}
          </button>
        ))}
      </nav>

      <button onClick={() => { setEditEvent(null); setFormOpen(true) }} style={{ position: 'fixed', bottom: 76, right: 16, width: 52, height: 52, borderRadius: 14, background: 'var(--green)', color: 'white', border: 'none', fontSize: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(26,107,74,.4)', zIndex: 99 }}>＋</button>

      <EventForm open={formOpen} onClose={() => { setFormOpen(false); setEditEvent(null) }} onSave={handleSaveEvent} initialData={editEvent} />
      <EventDetail event={detailEv} open={!!detailEv} onClose={() => setDetailEv(null)} onComplete={handleComplete} onReprogram={handleReprogram} onDelete={handleDelete} onEdit={handleEdit} onAddNote={store.addNote} config={store.config} />
      <Toast message={toast.msg} show={toast.show} />
    </>
  )
}
