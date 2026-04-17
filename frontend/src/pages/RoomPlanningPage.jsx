import React, { useState, useEffect, useRef, useCallback } from 'react';
import { sessionsService, roomsService, trainingService, userService } from '../services/api';
import {
  Calendar, ChevronLeft, ChevronRight, MapPin, User,
  Clock, Plus, X, Pencil, Trash2, Save, AlertTriangle,
  CheckCircle, Settings
} from 'lucide-react';

// ─── Constantes ───────────────────────────────
const HOUR_START  = 7;   // 07:00
const HOUR_END    = 22;  // 22:00
const HOUR_HEIGHT = 80;  // px par heure
const HOURS       = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => i + HOUR_START);
const HALF_HOURS  = Array.from({ length: (HOUR_END - HOUR_START) * 2 }, (_, i) => HOUR_START + i * 0.5);
const TOTAL_H     = (HOUR_END - HOUR_START) * HOUR_HEIGHT;

const ROOM_COLORS = [
  '#4f98a3','#7a5af8','#f59e0b','#10b981','#ef4444',
  '#6366f1','#ec4899','#14b8a6','#f97316','#8b5cf6'
];

const STATUS_STYLE = {
  planned:   { border: '2.5px solid', opacity: 1 },
  completed: { border: '2.5px solid', opacity: 0.65 },
  cancelled: { border: '2px dashed', opacity: 0.35 },
};

function formatHour(h) {
  const hh = Math.floor(h);
  const mm = h % 1 === 0.5 ? '30' : '00';
  return `${String(hh).padStart(2,'0')}:${mm}`;
}

function toDateStr(d) {
  return d.toISOString().split('T')[0];
}

function getMonday(d) {
  const dt = new Date(d);
  const day = dt.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  dt.setDate(dt.getDate() + diff);
  dt.setHours(0,0,0,0);
  return dt;
}

// ─── Session Block ────────────────────────────
function SessionBlock({ session, roomColor, onEdit, onDelete, onComplete }) {
  const [hover, setHover] = useState(false);
  if (!session.start_time || !session.end_time) return null;

  const st = new Date(session.start_time);
  const et = new Date(session.end_time);
  const startH = st.getHours() + st.getMinutes() / 60;
  const endH   = et.getHours() + et.getMinutes() / 60;

  if (endH <= HOUR_START || startH >= HOUR_END) return null;

  const clampedStart = Math.max(startH, HOUR_START);
  const clampedEnd   = Math.min(endH,   HOUR_END);
  const top    = (clampedStart - HOUR_START) * HOUR_HEIGHT;
  const height = Math.max((clampedEnd - clampedStart) * HOUR_HEIGHT - 4, 20);

  const color = session.room_color || roomColor || '#4f98a3';
  const sStyle = STATUS_STYLE[session.status] || STATUS_STYLE.planned;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'absolute',
        top: top + 2,
        left: 3,
        right: 3,
        height,
        background: `${color}22`,
        borderLeft: `4px solid ${color}`,
        border: sStyle.border + ` ${color}`,
        borderLeft: `4px solid ${color}`,
        borderRadius: 7,
        padding: '4px 7px',
        overflow: 'hidden',
        cursor: 'pointer',
        zIndex: 2,
        opacity: sStyle.opacity,
        transition: 'box-shadow 0.15s, transform 0.1s',
        boxShadow: hover ? `0 4px 16px ${color}44` : '0 1px 4px rgba(0,0,0,0.08)',
        transform: hover ? 'scale(1.012)' : 'scale(1)',
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, color, lineHeight: 1.3, marginBottom: 1 }}>
        {formatHour(startH)} – {formatHour(endH)}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {session.training_title}
      </div>
      {height > 45 && (
        <div style={{ fontSize: 11, opacity: 0.75, display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
          <User size={10} /> {session.trainer_name}
        </div>
      )}
      {height > 62 && session.notes && (
        <div style={{ fontSize: 10, opacity: 0.6, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {session.notes}
        </div>
      )}
      {hover && (
        <div style={{ position: 'absolute', top: 3, right: 3, display: 'flex', gap: 3 }}>
          {session.status === 'planned' && (
            <button
              onClick={e => { e.stopPropagation(); onComplete(session); }}
              style={{ background: '#10b981', border: 'none', borderRadius: 4, padding: '2px 4px', cursor: 'pointer', color: '#fff', fontSize: 10 }}
              title="Marquer terminée"
            ><CheckCircle size={11} /></button>
          )}
          <button
            onClick={e => { e.stopPropagation(); onEdit(session); }}
            style={{ background: color, border: 'none', borderRadius: 4, padding: '2px 4px', cursor: 'pointer', color: '#fff', fontSize: 10 }}
            title="Modifier"
          ><Pencil size={11} /></button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(session); }}
            style={{ background: '#ef4444', border: 'none', borderRadius: 4, padding: '2px 4px', cursor: 'pointer', color: '#fff', fontSize: 10 }}
            title="Annuler"
          ><Trash2 size={11} /></button>
        </div>
      )}
    </div>
  );
}

// ─── Session Form Modal ───────────────────────
function SessionModal({ open, onClose, onSave, rooms, trainings, trainers, initialData }) {
  const [form, setForm] = useState({
    training_id: '', trainer_id: '', room_id: '',
    date: '', start_hour: '09', start_min: '00',
    end_hour: '11',   end_min:   '00',
    notes: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  useEffect(() => {
    if (initialData) {
      const st = initialData.start_time ? new Date(initialData.start_time) : null;
      const et = initialData.end_time   ? new Date(initialData.end_time)   : null;
      setForm({
        training_id: initialData.training_id || '',
        trainer_id:  initialData.trainer_id  || '',
        room_id:     initialData.room_id     || '',
        date:        st ? toDateStr(st) : '',
        start_hour:  st ? String(st.getHours()).padStart(2,'0')   : '09',
        start_min:   st ? String(st.getMinutes()).padStart(2,'0') : '00',
        end_hour:    et ? String(et.getHours()).padStart(2,'0')   : '11',
        end_min:     et ? String(et.getMinutes()).padStart(2,'0') : '00',
        notes:       initialData.notes || ''
      });
    } else {
      setForm(f => ({ ...f, training_id:'', trainer_id:'', notes:'' }));
    }
    setError('');
  }, [initialData, open]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setError('');
    if (!form.training_id || !form.trainer_id || !form.room_id || !form.date) {
      setError('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    const startISO = `${form.date}T${form.start_hour}:${form.start_min}:00`;
    const endISO   = `${form.date}T${form.end_hour}:${form.end_min}:00`;
    if (endISO <= startISO) {
      setError('L\'heure de fin doit être après l\'heure de début.');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        id:          initialData?.id,
        training_id: Number(form.training_id),
        trainer_id:  Number(form.trainer_id),
        room_id:     Number(form.room_id),
        start_time:  startISO,
        end_time:    endISO,
        notes:       form.notes || null,
      });
      onClose();
    } catch (e) {
      setError(e?.response?.data?.detail || 'Erreur lors de l\'enregistrement.');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1000,
        display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="card" style={{ width:'100%', maxWidth:520, padding:'1.5rem', position:'relative' }}>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-bold flex items-center gap-0-5">
            <Calendar size={20} className="text-primary" />
            {initialData?.id ? 'Modifier la séance' : 'Programmer une séance'}
          </h2>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="grid grid-2 gap-1 mb-1">
          {/* Formation */}
          <div className="col-span-2">
            <label className="text-sm font-bold mb-0-5 block">Formation <span className="text-error">*</span></label>
            <select className="input w-full" value={form.training_id} onChange={e => set('training_id', e.target.value)}>
              <option value="">— Choisir —</option>
              {trainings.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </div>

          {/* Formateur */}
          <div>
            <label className="text-sm font-bold mb-0-5 block">Formateur <span className="text-error">*</span></label>
            <select className="input w-full" value={form.trainer_id} onChange={e => set('trainer_id', e.target.value)}>
              <option value="">— Choisir —</option>
              {trainers.map(t => (
                <option key={t.id} value={t.id}>
                  {t.user?.first_name} {t.user?.last_name}
                </option>
              ))}
            </select>
          </div>

          {/* Salle */}
          <div>
            <label className="text-sm font-bold mb-0-5 block">Salle <span className="text-error">*</span></label>
            <select className="input w-full" value={form.room_id} onChange={e => set('room_id', e.target.value)}>
              <option value="">— Choisir —</option>
              {rooms.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name}{r.capacity ? ` (${r.capacity}p)` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div className="col-span-2">
            <label className="text-sm font-bold mb-0-5 block">Date <span className="text-error">*</span></label>
            <input type="date" className="input w-full" value={form.date} onChange={e => set('date', e.target.value)} />
          </div>

          {/* Heures */}
          <div>
            <label className="text-sm font-bold mb-0-5 block">Début</label>
            <div className="flex gap-0-5 items-center">
              <select className="input flex-1" value={form.start_hour} onChange={e => set('start_hour', e.target.value)}>
                {HOURS.map(h => <option key={h} value={String(h).padStart(2,'0')}>{String(h).padStart(2,'0')}</option>)}
              </select>
              <span className="font-bold">:</span>
              <select className="input flex-1" value={form.start_min} onChange={e => set('start_min', e.target.value)}>
                {['00','15','30','45'].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-bold mb-0-5 block">Fin</label>
            <div className="flex gap-0-5 items-center">
              <select className="input flex-1" value={form.end_hour} onChange={e => set('end_hour', e.target.value)}>
                {HOURS.map(h => <option key={h} value={String(h).padStart(2,'0')}>{String(h).padStart(2,'0')}</option>)}
              </select>
              <span className="font-bold">:</span>
              <select className="input flex-1" value={form.end_min} onChange={e => set('end_min', e.target.value)}>
                {['00','15','30','45'].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div className="col-span-2">
            <label className="text-sm font-bold mb-0-5 block">Notes <span className="text-muted font-normal">(optionnel)</span></label>
            <input type="text" className="input w-full" placeholder="Ex : Apporter laptop..." value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-0-5 text-error text-sm mb-1" style={{ background:'rgba(239,68,68,0.07)', borderRadius:6, padding:'0.5rem 0.75rem' }}>
            <AlertTriangle size={15} /> {error}
          </div>
        )}

        <div className="flex gap-1 mt-1">
          <button className="btn btn-secondary flex-1" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary flex-1 flex items-center justify-center gap-0-5" onClick={handleSave} disabled={saving}>
            {saving ? 'Enregistrement...' : <><Save size={15} /> {initialData?.id ? 'Modifier' : 'Programmer'}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Room Manager Panel ───────────────────────
function RoomManagerPanel({ rooms, onRefresh, onClose }) {
  const [newName, setNewName]     = useState('');
  const [newCap,  setNewCap]      = useState('');
  const [newDesc, setNewDesc]     = useState('');
  const [newColor,setNewColor]    = useState(ROOM_COLORS[0]);
  const [saving,  setSaving]      = useState(false);
  const [error,   setError]       = useState('');
  const [editId,  setEditId]      = useState(null);
  const [editName,setEditName]    = useState('');
  const [editCap, setEditCap]     = useState('');
  const [editColor, setEditColor] = useState('');

  const handleCreate = async () => {
    if (!newName.trim()) { setError('Le nom est obligatoire.'); return; }
    setSaving(true); setError('');
    try {
      await roomsService.create({ name: newName.trim(), capacity: newCap ? Number(newCap) : null, description: newDesc || null, color: newColor });
      setNewName(''); setNewCap(''); setNewDesc('');
      onRefresh();
    } catch (e) {
      setError(e?.response?.data?.detail || 'Erreur.');
    } finally { setSaving(false); }
  };

  const handleUpdate = async (id) => {
    setSaving(true); setError('');
    try {
      await roomsService.update(id, { name: editName, capacity: editCap ? Number(editCap) : null, color: editColor });
      setEditId(null); onRefresh();
    } catch (e) {
      setError(e?.response?.data?.detail || 'Erreur.');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette salle ?')) return;
    try { await roomsService.remove(id); onRefresh(); }
    catch (e) { setError(e?.response?.data?.detail || 'Erreur.'); }
  };

  const startEdit = (r) => { setEditId(r.id); setEditName(r.name); setEditCap(r.capacity || ''); setEditColor(r.color); };

  return (
    <div className="card" style={{ width: 320, flexShrink: 0, padding: '1.25rem', height: '100%', overflowY: 'auto' }}>
      <div className="flex justify-between items-center mb-2">
        <h2 className="font-bold flex items-center gap-0-5"><Settings size={18} /> Gestion Salles</h2>
        <button className="btn-icon" onClick={onClose}><X size={18} /></button>
      </div>

      {/* Liste salles */}
      <div className="flex flex-col gap-0-75 mb-2">
        {rooms.length === 0 && <p className="text-sm text-muted text-center py-2">Aucune salle configurée.</p>}
        {rooms.map(r => (
          <div key={r.id} className="card p-1" style={{ border: `2px solid ${r.color}22` }}>
            {editId === r.id ? (
              <div className="flex flex-col gap-0-5">
                <input className="input w-full text-sm" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Nom" />
                <div className="flex gap-0-5">
                  <input className="input flex-1 text-sm" value={editCap} onChange={e => setEditCap(e.target.value)} placeholder="Capacité" type="number" />
                  <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)}
                    style={{ width: 36, height: 36, border: 'none', borderRadius: 6, cursor: 'pointer', padding: 2 }} />
                </div>
                <div className="flex gap-0-5">
                  <button className="btn btn-secondary text-xs flex-1" onClick={() => setEditId(null)}>Annuler</button>
                  <button className="btn btn-primary text-xs flex-1" onClick={() => handleUpdate(r.id)} disabled={saving}>Sauvegarder</button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-0-75">
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: r.color, flexShrink: 0 }} />
                  <div>
                    <div className="font-bold text-sm">{r.name}</div>
                    {r.capacity && <div className="text-xs text-muted">{r.capacity} places</div>}
                  </div>
                </div>
                <div className="flex gap-0-5">
                  <button className="btn-icon" onClick={() => startEdit(r)} title="Modifier"><Pencil size={14} /></button>
                  <button className="btn-icon" onClick={() => handleDelete(r.id)} style={{ color: '#ef4444' }} title="Supprimer"><Trash2 size={14} /></button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Créer salle */}
      <div style={{ borderTop: '1px solid var(--border, #e5e7eb)', paddingTop: '1rem' }}>
        <h3 className="text-sm font-bold mb-1">Ajouter une salle</h3>
        <div className="flex flex-col gap-0-75">
          <input className="input w-full text-sm" placeholder="Nom (ex: Salle A)" value={newName} onChange={e => setNewName(e.target.value)} />
          <div className="flex gap-0-5">
            <input className="input flex-1 text-sm" placeholder="Capacité" type="number" min="1" value={newCap} onChange={e => setNewCap(e.target.value)} />
            <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)}
              style={{ width: 36, height: 36, border: 'none', borderRadius: 6, cursor: 'pointer', padding: 2 }}
              title="Couleur de la salle" />
          </div>
          <input className="input w-full text-sm" placeholder="Description (optionnel)" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
          {error && <p className="text-error text-xs">{error}</p>}
          <button className="btn btn-primary w-full flex items-center justify-center gap-0-5 text-sm" onClick={handleCreate} disabled={saving}>
            <Plus size={14} /> {saving ? 'Création...' : 'Créer la salle'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Current Time Line ────────────────────────
function CurrentTimeLine() {
  const [top, setTop] = useState(null);
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const h = now.getHours() + now.getMinutes() / 60;
      if (h >= HOUR_START && h <= HOUR_END) {
        setTop((h - HOUR_START) * HOUR_HEIGHT);
      } else setTop(null);
    };
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, []);
  if (top === null) return null;
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, top,
      height: 2, background: '#ef4444', zIndex: 10, pointerEvents: 'none'
    }}>
      <div style={{
        position: 'absolute', left: -5, top: -4,
        width: 10, height: 10, borderRadius: '50%', background: '#ef4444'
      }} />
    </div>
  );
}

// ─── Main Page ────────────────────────────────
export default function RoomPlanningPage() {
  const [rooms,     setRooms]     = useState([]);
  const [sessions,  setSessions]  = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [trainers,  setTrainers]  = useState([]);
  const [loading,   setLoading]   = useState(true);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode,    setViewMode]    = useState('day'); // 'day' | 'week'
  const [showPanel,   setShowPanel]   = useState(false);
  const [modal,       setModal]       = useState({ open: false, data: null });
  const [toast,       setToast]       = useState(null);

  // Fetch rooms + trainings + trainers (once)
  const fetchMeta = useCallback(async () => {
    const [r, t, tr] = await Promise.all([
      roomsService.list(),
      trainingService.getTrainings(),
      userService.getTrainers(),
    ]);
    setRooms(r);
    setTrainings(t);
    setTrainers(tr);
  }, []);

  // Fetch sessions for current view
  const fetchSessions = useCallback(async () => {
    const params = {};
    if (viewMode === 'day') {
      params.date = toDateStr(currentDate);
    } else {
      params.week_start = toDateStr(getMonday(currentDate));
    }
    const data = await sessionsService.getPlanning(params);
    setSessions(data);
  }, [currentDate, viewMode]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchMeta(), fetchSessions()]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [currentDate, viewMode]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Navigation
  const navigate = (dir) => {
    const d = new Date(currentDate);
    if (viewMode === 'day') d.setDate(d.getDate() + dir);
    else d.setDate(d.getDate() + dir * 7);
    setCurrentDate(d);
  };

  const goToday = () => setCurrentDate(new Date());

  // Séances du jour/semaine filtrées
  const getDaySessions = (targetDate) => {
    const ds = toDateStr(targetDate);
    return sessions.filter(s => {
      if (!s.start_time) return false;
      return new Date(s.start_time).toISOString().split('T')[0] === ds;
    });
  };

  // Click sur une cellule vide → pré-remplir la modale
  const handleCellClick = (room, hour, targetDate) => {
    const d = toDateStr(targetDate || currentDate);
    const startH = String(Math.floor(hour)).padStart(2,'0');
    const startM = hour % 1 === 0.5 ? '30' : '00';
    const endH   = String(Math.floor(hour) + 2).padStart(2,'0');
    setModal({
      open: true,
      data: {
        room_id:     room?.id,
        date:        d,
        start_hour:  startH,
        start_min:   startM,
        end_hour:    endH,
        end_min:     '00',
      }
    });
  };

  // Sauvegarder séance (create ou update)
  const handleSaveSession = async (payload) => {
    if (payload.id) {
      await sessionsService.updatePlannedSession(payload.id, payload);
      showToast('Séance modifiée.');
    } else {
      await sessionsService.createPlannedSession(payload);
      showToast('Séance programmée !');
    }
    fetchSessions();
  };

  const handleDeleteSession = async (session) => {
    if (!window.confirm(`Annuler la séance "${session.training_title}" ?`)) return;
    await sessionsService.cancelSession(session.id);
    showToast('Séance annulée.', 'warning');
    fetchSessions();
  };

  const handleCompleteSession = async (session) => {
    await sessionsService.completeSession(session.id);
    showToast('Séance marquée terminée.', 'success');
    fetchSessions();
  };

  // ─── KPIs ───
  const todaySessions   = getDaySessions(currentDate);
  const occupiedRooms   = [...new Set(todaySessions.filter(s => s.room_id).map(s => s.room_id))].length;
  const totalPlannedH   = todaySessions.reduce((s, x) => s + (x.duration_hours || 0), 0);
  const maxH            = rooms.length * (HOUR_END - HOUR_START);
  const occupationRate  = maxH > 0 ? Math.round((totalPlannedH / maxH) * 100) : 0;

  // ─── Semaine : jours ───
  const weekDays = (() => {
    const mon = getMonday(currentDate);
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(mon); d.setDate(d.getDate() + i); return d;
    });
  })();

  const isToday = (d) => toDateStr(d) === toDateStr(new Date());

  // ─── Grille jour ───
  const renderDayGrid = () => (
    <div style={{ display: 'flex', minWidth: 0 }}>
      {/* Axe des heures */}
      <div style={{ width: 52, flexShrink: 0, position: 'relative', height: TOTAL_H + 1 }}>
        {HOURS.map(h => (
          <div key={h} style={{
            position: 'absolute', top: (h - HOUR_START) * HOUR_HEIGHT - 9,
            right: 6, fontSize: 11, fontWeight: 600, color: '#9ca3af', userSelect: 'none'
          }}>{String(h).padStart(2,'0')}:00</div>
        ))}
      </div>

      {/* Colonnes salles */}
      {rooms.map(room => {
        const roomSessions = sessions.filter(s =>
          s.room_id === room.id ||
          (s.room_name && s.room_name === room.name)
        ).filter(s => {
          if (!s.start_time) return false;
          return new Date(s.start_time).toISOString().split('T')[0] === toDateStr(currentDate);
        });
        return (
          <div key={room.id} style={{ flex: 1, minWidth: 120, borderLeft: '1px solid #e5e7eb', position: 'relative', height: TOTAL_H }}>
            {/* Lignes heure */}
            {HOURS.map(h => (
              <div key={h} style={{ position: 'absolute', top: (h - HOUR_START) * HOUR_HEIGHT, left: 0, right: 0, height: HOUR_HEIGHT, borderBottom: '1px solid #f3f4f6' }}>
                {/* Demi-heure */}
                <div style={{ position: 'absolute', top: HOUR_HEIGHT / 2, left: 0, right: 0, borderBottom: '1px dashed #f3f4f6' }} />
                {/* Zone cliquable */}
                <div
                  style={{ position: 'absolute', inset: 0, cursor: 'cell' }}
                  onClick={() => handleCellClick(room, h)}
                  title={`Programmer dans ${room.name} à ${String(h).padStart(2,'0')}:00`}
                />
              </div>
            ))}
            {/* Ligne heure courante */}
            <CurrentTimeLine />
            {/* Blocs séances */}
            {roomSessions.map(s => (
              <SessionBlock
                key={s.id}
                session={s}
                roomColor={room.color}
                onEdit={s => setModal({ open: true, data: s })}
                onDelete={handleDeleteSession}
                onComplete={handleCompleteSession}
              />
            ))}
          </div>
        );
      })}
    </div>
  );

  // ─── Grille semaine ───
  const renderWeekGrid = () => (
    <div style={{ display: 'flex', minWidth: 0 }}>
      <div style={{ width: 52, flexShrink: 0, position: 'relative', height: TOTAL_H + 1 }}>
        {HOURS.map(h => (
          <div key={h} style={{
            position: 'absolute', top: (h - HOUR_START) * HOUR_HEIGHT - 9,
            right: 6, fontSize: 11, fontWeight: 600, color: '#9ca3af', userSelect: 'none'
          }}>{String(h).padStart(2,'0')}:00</div>
        ))}
      </div>
      {weekDays.map(day => (
        <div key={toDateStr(day)} style={{ flex: 1, minWidth: 90, borderLeft: '1px solid #e5e7eb', position: 'relative', height: TOTAL_H }}>
          {HOURS.map(h => (
            <div key={h} style={{ position: 'absolute', top: (h - HOUR_START) * HOUR_HEIGHT, left: 0, right: 0, height: HOUR_HEIGHT, borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ position: 'absolute', top: HOUR_HEIGHT / 2, left: 0, right: 0, borderBottom: '1px dashed #f3f4f6' }} />
              <div style={{ position: 'absolute', inset: 0, cursor: 'cell' }} onClick={() => handleCellClick(null, h, day)} />
            </div>
          ))}
          <CurrentTimeLine />
          {getDaySessions(day).map(s => (
            <SessionBlock
              key={s.id}
              session={s}
              roomColor={rooms.find(r => r.id === s.room_id)?.color || '#4f98a3'}
              onEdit={s => setModal({ open: true, data: s })}
              onDelete={handleDeleteSession}
              onComplete={handleCompleteSession}
            />
          ))}
        </div>
      ))}
    </div>
  );

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 2000,
          background: toast.type === 'success' ? '#10b981' : toast.type === 'warning' ? '#f59e0b' : '#ef4444',
          color: '#fff', borderRadius: 10, padding: '0.75rem 1.25rem',
          fontWeight: 600, fontSize: 14, boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
        }}>{toast.msg}</div>
      )}

      {/* Header */}
      <div className="flex justify-between items-start flex-wrap gap-1">
        <div>
          <h1 className="text-2xl font-bold">Planning des Salles</h1>
          <p className="text-muted">Programmez et visualisez l'occupation des salles.</p>
        </div>
        <div className="flex items-center gap-0-75">
          <button
            className="btn btn-secondary flex items-center gap-0-5 text-sm"
            onClick={() => setShowPanel(v => !v)}
          >
            <Settings size={15} /> Salles
          </button>
          <button
            className="btn btn-primary flex items-center gap-0-5 text-sm"
            onClick={() => setModal({ open: true, data: null })}
          >
            <Plus size={15} /> Programmer séance
          </button>
        </div>
      </div>

      {/* Corps : panel + grille */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        {/* Panel gestion salles */}
        {showPanel && (
          <RoomManagerPanel
            rooms={rooms}
            onRefresh={fetchMeta}
            onClose={() => setShowPanel(false)}
          />
        )}

        {/* Grille principale */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Toolbar navigation */}
          <div className="flex items-center gap-1 mb-1 flex-wrap">
            {/* Vue */}
            <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border, #e5e7eb)' }}>
              {['day','week'].map(v => (
                <button
                  key={v}
                  className={`px-3 py-1 text-sm font-bold transition-all ${
                    viewMode === v ? 'btn-primary' : 'bg-glass'
                  }`}
                  style={{ border: 'none', cursor: 'pointer' }}
                  onClick={() => setViewMode(v)}
                >
                  {v === 'day' ? 'Jour' : 'Semaine'}
                </button>
              ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-0-5 bg-white rounded-lg px-1" style={{ border: '1px solid var(--border, #e5e7eb)' }}>
              <button className="btn-icon" onClick={() => navigate(-1)}><ChevronLeft size={18} /></button>
              <span className="font-bold text-sm px-1" style={{ minWidth: 180, textAlign: 'center' }}>
                {viewMode === 'day'
                  ? currentDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
                  : `Sem. du ${getMonday(currentDate).toLocaleDateString('fr-FR', { day:'numeric', month:'short' })} au ${weekDays[5]?.toLocaleDateString('fr-FR', { day:'numeric', month:'short', year:'numeric' })}`
                }
              </span>
              <button className="btn-icon" onClick={() => navigate(1)}><ChevronRight size={18} /></button>
            </div>
            <button className="btn btn-secondary text-sm" onClick={goToday}>Aujourd'hui</button>
          </div>

          {/* En-tête colonnes */}
          <div className="card p-0 overflow-x-auto" style={{ borderBottom: '2px solid var(--border, #e5e7eb)' }}>
            <div style={{ display: 'flex' }}>
              {/* Spacer axe heures */}
              <div style={{ width: 52, flexShrink: 0 }} />
              {viewMode === 'day'
                ? rooms.map(room => (
                    <div key={room.id} style={{ flex: 1, minWidth: 120, borderLeft: '1px solid #e5e7eb', padding: '0.5rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: room.color, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{room.name}</div>
                        {room.capacity && <div style={{ fontSize: 11, color: '#9ca3af' }}>{room.capacity} places</div>}
                      </div>
                    </div>
                  ))
                : weekDays.map(day => (
                    <div key={toDateStr(day)} style={{
                      flex: 1, minWidth: 90, borderLeft: '1px solid #e5e7eb',
                      padding: '0.5rem', textAlign: 'center',
                      background: isToday(day) ? 'rgba(79,152,163,0.08)' : 'transparent'
                    }}>
                      <div style={{ fontWeight: 700, fontSize: 12, textTransform: 'capitalize' }}>
                        {day.toLocaleDateString('fr-FR', { weekday: 'short' })}
                      </div>
                      <div style={{
                        fontWeight: isToday(day) ? 800 : 600, fontSize: 16,
                        color: isToday(day) ? '#4f98a3' : 'inherit'
                      }}>{day.getDate()}</div>
                    </div>
                  ))
              }
            </div>
          </div>

          {/* Corps grille */}
          <div className="card p-0 overflow-x-auto" style={{ position: 'relative' }}>
            {loading
              ? <div className="p-3 text-center text-muted">Chargement...</div>
              : rooms.length === 0
                ? (
                  <div className="p-4 text-center text-muted">
                    <MapPin size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
                    <p className="font-bold">Aucune salle configurée</p>
                    <p className="text-sm mt-0-5">Cliquez sur "Salles" pour en ajouter.</p>
                  </div>
                )
                : (
                  <div style={{ minWidth: viewMode === 'day' ? rooms.length * 120 + 52 : 600, userSelect: 'none' }}>
                    {viewMode === 'day' ? renderDayGrid() : renderWeekGrid()}
                  </div>
                )
            }
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-3 gap-1-5">
        <div className="card flex items-center gap-1 p-1-5">
          <div className="p-1 rounded-lg" style={{ background: 'rgba(79,152,163,0.12)', color: '#4f98a3' }}>
            <Clock size={22} />
          </div>
          <div>
            <p className="text-xs font-bold text-muted uppercase">Séances du jour</p>
            <h3 className="text-xl font-bold">{todaySessions.length}</h3>
          </div>
        </div>
        <div className="card flex items-center gap-1 p-1-5">
          <div className="p-1 rounded-lg" style={{ background: 'rgba(122,90,248,0.12)', color: '#7a5af8' }}>
            <MapPin size={22} />
          </div>
          <div>
            <p className="text-xs font-bold text-muted uppercase">Salles occupées</p>
            <h3 className="text-xl font-bold">{occupiedRooms} / {rooms.length}</h3>
          </div>
        </div>
        <div className="card flex items-center gap-1 p-1-5">
          <div className="p-1 rounded-lg" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
            <Calendar size={22} />
          </div>
          <div>
            <p className="text-xs font-bold text-muted uppercase">Taux occupation</p>
            <h3 className="text-xl font-bold">{occupationRate}%</h3>
          </div>
        </div>
      </div>

      {/* Modal séance */}
      <SessionModal
        open={modal.open}
        onClose={() => setModal({ open: false, data: null })}
        onSave={handleSaveSession}
        rooms={rooms}
        trainings={trainings}
        trainers={trainers}
        initialData={modal.data}
      />
    </div>
  );
}
