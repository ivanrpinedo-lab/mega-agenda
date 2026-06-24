import { useState, useMemo } from 'react'
import { Modal, FormGroup, Input, Select, Textarea, Btn, SectionHeader, Empty, NoteCard } from '../components/UI'
import { buildWAMessage } from '../utils/helpers'

const WA_VARS = ['{{nombre}}','{{empresa}}','{{monto}}','{{moneda}}','{{fecha_venc}}','{{num_factura}}','{{concepto}}','{{dias_restantes}}']

function previewMessage(body) {
  return body
    .replace(/{{nombre}}/g, 'Juan García')
    .replace(/{{empresa}}/g, 'Mega Sostenible SAC')
    .replace(/{{monto}}/g, '850.00')
    .replace(/{{moneda}}/g, 'S/')
    .replace(/{{fecha_venc}}/g, '30/06/2026')
    .replace(/{{num_factura}}/g, 'F-0045')
    .replace(/{{concepto}}/g, 'Servicio ISP Mensual')
    .replace(/{{hora}}/g, '10:00')
    .replace(/{{dias_restantes}}/g, '5')
}

export function WhatsApp({ events, templates, history, onSaveTemplate, onDeleteTemplate, onAddHistory, config }) {
  const [open, setOpen] = useState(false)
  const [tplName, setTplName] = useState('')
  const [tplBody, setTplBody] = useState('Hola {{nombre}}, le recordamos que tiene un pago pendiente de *{{moneda}}{{monto}}* por _{{concepto}}_ con vencimiento el *{{fecha_venc}}*. Coordine con nosotros. — {{empresa}} 🌿')
  const [filterType, setFilterType] = useState('todos')

  const targets = useMemo(() => {
    let evs = events.filter(e => e.phone && e.status !== 'completed')
    if (filterType !== 'todos') evs = evs.filter(e => e.type === filterType)
    return evs
  }, [events, filterType])

  const handleSend = () => {
    if (!tplBody.trim()) return
    if (!targets.length) { alert('Sin contactos con WhatsApp registrado'); return }
    // Open WA for first contact as demo (in production: loop or use YCloud API)
    const ev = targets[0]
    const msg = buildWAMessage(tplBody, ev, config?.empresa)
    const phone = ev.phone.replace(/\D/g, '')
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank')
    onAddHistory({ eventTitle: `Campaña masiva — ${targets.length} contactos`, action: 'WA masivo enviado', date: new Date().toISOString().split('T')[0], note: `Plantilla: ${tplName || 'Sin nombre'}`, status: 'sent' })
    setOpen(false)
  }

  const handleSaveTemplate = () => {
    if (!tplName.trim() || !tplBody.trim()) { alert('Completa nombre y mensaje'); return }
    onSaveTemplate({ name: tplName, body: tplBody, filterType })
    setOpen(false)
    setTplName(''); setTplBody('')
  }

  const useTemplate = (tpl) => {
    setTplName(tpl.name); setTplBody(tpl.body); setFilterType(tpl.filterType || 'todos')
    setOpen(true)
  }

  const waHistory = history.filter(h => h.action?.includes('WA'))

  return (
    <div style={{ paddingBottom: 80 }}>
      <SectionHeader
        title="📱 WhatsApp Masivo"
        action={<Btn variant="whatsapp" size="sm" onClick={() => setOpen(true)}>+ Nueva campaña</Btn>}
      />

      {/* Variables card */}
      <div style={{ background: 'var(--surface)', borderRadius: 14, padding: 16, boxShadow: 'var(--shadow)', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Variables disponibles en tus mensajes:</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {WA_VARS.map(v => (
            <span key={v} style={{ background: '#E8F5E9', color: '#1A7A3A', borderRadius: 4, padding: '2px 8px', fontSize: 12, fontWeight: 600 }}>{v}</span>
          ))}
        </div>
      </div>

      <SectionHeader title="Plantillas guardadas" />
      {templates.length > 0
        ? templates.map(t => (
          <div key={t.id} style={{ background: 'var(--surface)', borderRadius: 14, padding: 14, marginBottom: 10, boxShadow: 'var(--shadow)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>📄 {t.name}</div>
            <div style={{ background: '#E8F5E9', borderRadius: 10, padding: 10, fontSize: 12, borderLeft: '3px solid #25D366', marginBottom: 10, lineHeight: 1.5 }}>
              {t.body.substring(0, 130)}{t.body.length > 130 ? '…' : ''}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn variant="whatsapp" size="sm" onClick={() => useTemplate(t)}>Usar plantilla</Btn>
              <Btn variant="danger" size="sm" onClick={() => onDeleteTemplate(t.id)}>🗑️</Btn>
            </div>
          </div>
        ))
        : <Empty icon="📝" title="Sin plantillas" sub="Crea tu primera campaña con el botón Nueva campaña" />
      }

      <SectionHeader title="Historial de envíos" />
      {waHistory.length > 0
        ? waHistory.slice().reverse().map(h => <NoteCard key={h.id} date={h.date} action={h.action} note={h.note} color="#25D366" />)
        : <div style={{ color: 'var(--text-light)', fontSize: 13, padding: '12px 0' }}>Sin envíos registrados aún.</div>
      }

      {/* Campaign modal */}
      <Modal open={open} onClose={() => setOpen(false)} title="📱 Nueva Campaña WhatsApp">
        <FormGroup label="Nombre de la plantilla">
          <Input value={tplName} onChange={e => setTplName(e.target.value)} placeholder="Ej: Cobro mensual servicio ISP" />
        </FormGroup>
        <FormGroup label="Filtrar destinatarios por tipo">
          <Select value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="todos">Todos los eventos con WhatsApp</option>
            <option value="cobro">Solo cobros</option>
            <option value="pago">Solo pagos</option>
            <option value="letra">Solo letras de cambio</option>
            <option value="reunion">Solo reuniones</option>
          </Select>
        </FormGroup>
        <FormGroup label="Mensaje">
          <Textarea value={tplBody} onChange={e => setTplBody(e.target.value)} rows={6} placeholder="Escribe el mensaje con variables {{nombre}}, {{monto}}, etc." />
        </FormGroup>
        <div style={{ fontSize: 12, color: 'var(--text-mid)', marginBottom: 6 }}>Vista previa:</div>
        <div style={{ background: '#E8F5E9', borderRadius: 12, padding: 14, fontSize: 13, borderLeft: '3px solid #25D366', whiteSpace: 'pre-wrap', lineHeight: 1.6, marginBottom: 12 }}>
          {previewMessage(tplBody) || '—'}
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)', marginBottom: 12 }}>
          📤 Destinatarios: {targets.length} contacto{targets.length !== 1 ? 's' : ''} con WhatsApp registrado
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Btn variant="whatsapp" style={{ flex: 1 }} onClick={handleSend}>📤 Enviar por WhatsApp</Btn>
          <Btn variant="secondary" size="sm" onClick={handleSaveTemplate}>💾 Guardar plantilla</Btn>
          <Btn variant="secondary" size="sm" onClick={() => setOpen(false)}>Cancelar</Btn>
        </div>
      </Modal>
    </div>
  )
}
