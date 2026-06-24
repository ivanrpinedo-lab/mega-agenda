import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'megaagenda_v2'

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

function getInitialState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch (e) {}
  return null
}

function seedEvents() {
  const today = new Date()
  const d = (offset) => {
    const dd = new Date(today)
    dd.setDate(dd.getDate() + offset)
    return dd.toISOString().split('T')[0]
  }
  return [
    { id: uid(), type: 'cobro', title: 'Factura ISP - Municipalidad Juanjuí', date: d(2), time: '10:00', amount: 1850, currency: 'S/', contact: 'Municipalidad Juanjuí', phone: '+51987654321', recurrence: 'monthly', alarm: true, status: 'pending', notes: 'Renovación contrato mensual', history: [], createdAt: new Date().toISOString() },
    { id: uid(), type: 'pago', title: 'Alquiler equipos INDYA Yapango', date: d(-1), time: '08:00', amount: 650, currency: 'S/', contact: 'INDYA Yapango SAC', phone: '+51987111222', recurrence: 'none', alarm: true, status: 'overdue', notes: '', history: [], createdAt: new Date().toISOString() },
    { id: uid(), type: 'reunion', title: 'Presentación AmazonWatch - UNSM-T', date: d(3), time: '14:00', amount: 0, currency: 'S/', contact: 'Dr. Responsable UNSM', phone: '', recurrence: 'none', alarm: true, status: 'pending', notes: 'Llevar informe técnico y presupuesto', history: [], createdAt: new Date().toISOString() },
    { id: uid(), type: 'concurso', title: 'Postulación PROCIENCIA Desafíos Regionales', date: d(5), time: '23:59', amount: 0, currency: 'S/', contact: 'CONCYTEC', phone: '', recurrence: 'none', alarm: true, status: 'pending', notes: 'Proyecto AmazonWatch - Torres Vivas', history: [], createdAt: new Date().toISOString() },
    { id: uid(), type: 'cobro', title: 'Factura #045 - Agropecuaria Shilcayo', date: d(7), time: '09:00', amount: 3200, currency: 'S/', contact: 'Agropecuaria Shilcayo', phone: '+51999888777', recurrence: 'none', alarm: true, status: 'pending', notes: '', history: [], createdAt: new Date().toISOString() },
    { id: uid(), type: 'documento', title: 'Entrega informe AMAZONCHAR ProInnóvate', date: d(10), time: '17:00', amount: 0, currency: 'S/', contact: 'ProInnóvate', phone: '', recurrence: 'none', alarm: true, status: 'pending', notes: 'Paquete completo con anexos', history: [], createdAt: new Date().toISOString() },
    { id: uid(), type: 'letra', title: 'Letra de cambio - Cliente Torres', date: d(-3), time: '12:00', amount: 4500, currency: 'S/', contact: 'Julio Torres Ramírez', phone: '+51987555444', recurrence: 'none', alarm: true, status: 'completed', notes: '', history: [{ date: d(-3), action: 'Cobrado', note: 'Pago recibido en efectivo' }], createdAt: new Date().toISOString() },
    { id: uid(), type: 'capacitacion', title: 'Capacitación IoT Grafana + n8n', date: d(14), time: '08:00', amount: 0, currency: 'S/', contact: 'Equipo técnico Meganet', phone: '', recurrence: 'none', alarm: false, status: 'pending', notes: '', history: [], createdAt: new Date().toISOString() },
  ]
}

function seedTemplates() {
  return [
    { id: uid(), name: 'Recordatorio cobro mensual', body: 'Hola {{nombre}}, le recordamos que tiene un pago pendiente de *{{moneda}}{{monto}}* por _{{concepto}}_ con vencimiento el *{{fecha_venc}}*. Coordine con nosotros. — {{empresa}} 🌿', filterType: 'cobro' },
    { id: uid(), name: 'Aviso vencimiento letra', body: 'Estimado/a {{nombre}}, su letra de cambio por *{{moneda}}{{monto}}* vence en *{{dias_restantes}} días* ({{fecha_venc}}). Coordinemos el pago. — {{empresa}}', filterType: 'letra' },
    { id: uid(), name: 'Confirmación de reunión', body: 'Hola {{nombre}}, confirmamos la reunión *{{concepto}}* para el {{fecha_venc}}. Favor confirmar asistencia. — {{empresa}}', filterType: 'reunion' },
  ]
}

const defaultState = {
  events: [],
  templates: [],
  history: [],
  config: {
    empresa: 'Mega Sostenible SAC',
    ruc: '',
    wa: '',
    moneda: 'S/',
    diasAnticipacion: 3,
    alarma: true,
    push: true,
    anticipar: true,
  }
}

let listeners = []
let globalState = (() => {
  const saved = getInitialState()
  if (saved) return { ...defaultState, ...saved }
  return { ...defaultState, events: seedEvents(), templates: seedTemplates() }
})()

function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(globalState)) } catch (e) {}
}

function notifyAll() {
  listeners.forEach(fn => fn({ ...globalState }))
}

function setState(updater) {
  globalState = typeof updater === 'function' ? updater(globalState) : { ...globalState, ...updater }
  persist()
  notifyAll()
}

export function useStore() {
  const [state, setLocalState] = useState({ ...globalState })

  useEffect(() => {
    const fn = (newState) => setLocalState(newState)
    listeners.push(fn)
    return () => { listeners = listeners.filter(l => l !== fn) }
  }, [])

  const addEvent = useCallback((ev) => {
    setState(s => ({ ...s, events: [...s.events, { ...ev, id: uid(), createdAt: new Date().toISOString(), history: [] }] }))
  }, [])

  const updateEvent = useCallback((id, updates) => {
    setState(s => ({ ...s, events: s.events.map(e => e.id === id ? { ...e, ...updates } : e) }))
  }, [])

  const deleteEvent = useCallback((id) => {
    setState(s => ({ ...s, events: s.events.filter(e => e.id !== id) }))
  }, [])

  const completeEvent = useCallback((id, note = '') => {
    setState(s => {
      const ev = s.events.find(e => e.id === id)
      return {
        ...s,
        events: s.events.map(e => e.id === id ? {
          ...e, status: 'completed',
          history: [...(e.history || []), { date: new Date().toLocaleDateString('es-PE'), action: 'Completado', note }]
        } : e),
        history: [...s.history, { id: uid(), eventTitle: ev?.title || '', action: 'Completado', date: new Date().toISOString().split('T')[0], note, status: 'resolved' }]
      }
    })
  }, [])

  const reprogramEvent = useCallback((id, newDate, note = '') => {
    setState(s => {
      const ev = s.events.find(e => e.id === id)
      const oldDate = ev?.date
      return {
        ...s,
        events: s.events.map(e => e.id === id ? {
          ...e, date: newDate, status: 'pending',
          history: [...(e.history || []), { date: new Date().toLocaleDateString('es-PE'), action: 'Reprogramado', note: `De ${oldDate} a ${newDate}${note ? ' — ' + note : ''}` }]
        } : e),
        history: [...s.history, { id: uid(), eventTitle: ev?.title || '', action: 'Reprogramado', date: new Date().toISOString().split('T')[0], note: `De ${oldDate} a ${newDate}`, status: 'reprogrammed' }]
      }
    })
  }, [])

  const addNote = useCallback((id, note) => {
    setState(s => ({
      ...s,
      events: s.events.map(e => e.id === id ? {
        ...e,
        history: [...(e.history || []), { date: new Date().toLocaleDateString('es-PE'), action: 'Nota agregada', note }]
      } : e)
    }))
  }, [])

  const saveTemplate = useCallback((tpl) => {
    setState(s => ({ ...s, templates: [...s.templates, { ...tpl, id: uid() }] }))
  }, [])

  const deleteTemplate = useCallback((id) => {
    setState(s => ({ ...s, templates: s.templates.filter(t => t.id !== id) }))
  }, [])

  const updateConfig = useCallback((cfg) => {
    setState(s => ({ ...s, config: { ...s.config, ...cfg } }))
  }, [])

  const addHistoryEntry = useCallback((entry) => {
    setState(s => ({ ...s, history: [...s.history, { ...entry, id: uid() }] }))
  }, [])

  const importData = useCallback((data) => {
    setState(() => ({ ...defaultState, ...data }))
  }, [])

  const clearData = useCallback(() => {
    setState(() => ({ ...defaultState, events: seedEvents(), templates: seedTemplates() }))
  }, [])

  return {
    ...state,
    addEvent, updateEvent, deleteEvent, completeEvent,
    reprogramEvent, addNote, saveTemplate, deleteTemplate,
    updateConfig, addHistoryEntry, importData, clearData
  }
}
