import React, { useState, useEffect, useRef } from 'react';
import { roomsService } from '../services/api';

const DAYS_FR = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

function getMondayOfWeek(d = new Date()) {
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  return monday.toISOString().split('T')[0];
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function RoomStatsPage() {
  const [tab, setTab] = useState('week'); // 'week' | 'occupation'
  const [weekStart, setWeekStart] = useState(getMondayOfWeek());
  const [weekData, setWeekData] = useState(null);
  const [occupationData, setOccupationData] = useState(null);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const printRef = useRef();

  useEffect(() => {
    if (tab === 'week') loadWeek();
    else loadOccupation();
  }, [tab]);

  const loadWeek = async (ws = weekStart) => {
    setLoading(true); setError(null);
    try {
      const data = await roomsService.getWeekConsolidated(ws);
      setWeekData(data);
    } catch (e) {
      setError('Erreur lors du chargement de la vue semaine.');
    } finally { setLoading(false); }
  };

  const loadOccupation = async (from = dateFrom, to = dateTo) => {
    setLoading(true); setError(null);
    try {
      const data = await roomsService.getOccupationStats(from, to);
      setOccupationData(data);
    } catch (e) {
      setError('Erreur lors du chargement des statistiques.');
    } finally { setLoading(false); }
  };

  const handlePrevWeek = () => {
    const d = new Date(weekStart + 'T00:00:00');
    d.setDate(d.getDate() - 7);
    const ws = d.toISOString().split('T')[0];
    setWeekStart(ws);
    loadWeek(ws);
  };

  const handleNextWeek = () => {
    const d = new Date(weekStart + 'T00:00:00');
    d.setDate(d.getDate() + 7);
    const ws = d.toISOString().split('T')[0];
    setWeekStart(ws);
    loadWeek(ws);
  };

  const handlePrint = () => {
    const content = printRef.current;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html><head><title>Planning Salles</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 11px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: center; }
        th { background: #f0f0f0; font-weight: bold; }
        .over { background: #fee2e2 !important; }
        .badge { display: inline-block; background: #ef4444; color: #fff; border-radius: 4px; padding: 1px 5px; font-size: 10px; margin-left: 4px; }
        @media print { button { display: none; } }
      </style>
      </head><body>${content.innerHTML}<script>window.print();<\/script></body></html>
    `);
    printWindow.document.close();
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1300px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: '#1e293b' }}>
          📊 Statistiques des Salles
        </h2>
        <button
          onClick={handlePrint}
          style={{
            background: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px',
            padding: '8px 18px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem'
          }}
        >
          🖨️ Exporter PDF
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {[['week', '📅 Vue Semaine Consolidée'], ['occupation', '📈 Taux d\'Occupation']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: '8px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: '0.88rem',
              background: tab === key ? '#01696f' : '#f1f5f9',
              color: tab === key ? '#fff' : '#475569',
              transition: 'all 0.18s'
            }}
          >{label}</button>
        ))}
      </div>

      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── TAB : SEMAINE CONSOLIDÉE ── */}
      {tab === 'week' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <button onClick={handlePrevWeek} style={navBtnStyle}>← Semaine préc.</button>
            <span style={{ fontWeight: 600, color: '#334155' }}>
              Semaine du {weekData ? formatDate(weekData.week_start) : formatDate(weekStart)}
              {' '}au {weekData ? formatDate(weekData.week_end) : ''}
            </span>
            <button onClick={handleNextWeek} style={navBtnStyle}>Semaine suiv. →</button>
            <button onClick={() => { const ws = getMondayOfWeek(); setWeekStart(ws); loadWeek(ws); }} style={{ ...navBtnStyle, background: '#e2e8f0' }}>
              Aujourd'hui
            </button>
          </div>

          {loading ? <Spinner /> : weekData && (
            <div ref={printRef}>
              <h3 style={{ fontSize: '1rem', marginBottom: '12px', color: '#475569' }}>
                Planning consolidé — toutes salles
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.82rem' }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Salle / Capacité</th>
                      {weekData.days.map((day, i) => (
                        <th key={day} style={{ ...thStyle, minWidth: '110px' }}>
                          <div style={{ fontWeight: 700 }}>{DAYS_FR[i]}</div>
                          <div style={{ fontWeight: 400, fontSize: '0.78rem', color: '#64748b' }}>{formatDate(day)}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {weekData.grid.map((room) => (
                      <tr key={room.room_id}>
                        <td style={{ ...tdStyle, fontWeight: 700, background: '#f8fafc', minWidth: '120px' }}>
                          <span style={{
                            display: 'inline-block', width: '10px', height: '10px',
                            borderRadius: '50%', background: room.room_color, marginRight: '6px'
                          }} />
                          {room.room_name}
                          {room.capacity && (
                            <div style={{ fontWeight: 400, fontSize: '0.75rem', color: '#94a3b8' }}>
                              Cap. {room.capacity}
                            </div>
                          )}
                        </td>
                        {weekData.days.map((day) => {
                          const cell = room.days[day];
                          const isOver = cell?.over_capacity;
                          return (
                            <td key={day} style={{
                              ...tdStyle,
                              background: isOver ? '#fee2e2' : cell?.session_count > 0 ? '#f0fdf4' : '#fafafa',
                              verticalAlign: 'top'
                            }}>
                              {cell?.sessions?.length > 0 ? (
                                <div>
                                  {cell.sessions.map((s, idx) => (
                                    <div key={idx} style={{
                                      background: '#fff', border: '1px solid #e2e8f0',
                                      borderRadius: '5px', padding: '3px 6px', marginBottom: '3px',
                                      fontSize: '0.78rem', textAlign: 'left'
                                    }}>
                                      <div style={{ fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100px' }}>
                                        {s.training_name || '—'}
                                      </div>
                                      {s.time_start && (
                                        <div style={{ color: '#64748b' }}>{s.time_start?.slice(0,5)} – {s.time_end?.slice(0,5)}</div>
                                      )}
                                      {s.enrolled_count > 0 && (
                                        <div style={{ color: isOver ? '#dc2626' : '#16a34a', fontWeight: 600 }}>
                                          {s.enrolled_count} inscrits
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                  {isOver && (
                                    <div style={{ color: '#dc2626', fontWeight: 700, fontSize: '0.78rem', marginTop: '2px' }}>
                                      ⚠️ Capacité dépassée
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span style={{ color: '#cbd5e1', fontSize: '0.78rem' }}>—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {weekData.grid.length === 0 && (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                          Aucune salle active ou aucune session cette semaine.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB : TAUX D'OCCUPATION ── */}
      {tab === 'occupation' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <label style={labelStyle}>Du
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inputStyle} />
            </label>
            <label style={labelStyle}>Au
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inputStyle} />
            </label>
            <button onClick={() => loadOccupation(dateFrom, dateTo)} style={{
              background: '#01696f', color: '#fff', border: 'none', borderRadius: '8px',
              padding: '8px 18px', cursor: 'pointer', fontWeight: 600
            }}>Appliquer</button>
          </div>

          {loading ? <Spinner /> : occupationData && (
            <div ref={printRef}>
              {/* Alertes capacité dépassée */}
              {occupationData.rooms.some(r => r.over_capacity_count > 0) && (
                <div style={{
                  background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '10px',
                  padding: '12px 16px', marginBottom: '20px'
                }}>
                  <div style={{ fontWeight: 700, color: '#92400e', marginBottom: '6px' }}>⚠️ Alertes capacité dépassée</div>
                  {occupationData.rooms.filter(r => r.over_capacity_count > 0).map(r => (
                    <div key={r.room_id} style={{ color: '#b45309', fontSize: '0.88rem', marginBottom: '2px' }}>
                      • <strong>{r.room_name}</strong> — {r.over_capacity_count} session(s) avec inscrits &gt; capacité ({r.capacity})
                    </div>
                  ))}
                </div>
              )}

              {/* KPI Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
                {occupationData.rooms.map(room => (
                  <div key={room.room_id} style={{
                    background: '#fff', border: `2px solid ${room.room_color}22`,
                    borderLeft: `4px solid ${room.room_color}`,
                    borderRadius: '10px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e293b' }}>{room.room_name}</div>
                        {room.capacity > 0 && (
                          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Capacité : {room.capacity} pers.</div>
                        )}
                      </div>
                      {room.over_capacity_count > 0 && (
                        <span style={{
                          background: '#dc2626', color: '#fff', borderRadius: '999px',
                          padding: '2px 8px', fontSize: '0.75rem', fontWeight: 700
                        }}>⚠️ {room.over_capacity_count}</span>
                      )}
                    </div>

                    {/* Barre d'occupation */}
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.78rem', color: '#475569' }}>Taux d'occupation</span>
                        <span style={{ fontWeight: 700, fontSize: '0.92rem', color: room.occupation_rate > 80 ? '#dc2626' : room.occupation_rate > 50 ? '#d97706' : '#16a34a' }}>
                          {room.occupation_rate}%
                        </span>
                      </div>
                      <div style={{ background: '#e2e8f0', borderRadius: '999px', height: '8px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${Math.min(room.occupation_rate, 100)}%`,
                          height: '100%',
                          background: room.occupation_rate > 80 ? '#dc2626' : room.occupation_rate > 50 ? '#f59e0b' : '#22c55e',
                          borderRadius: '999px',
                          transition: 'width 0.4s ease'
                        }} />
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '6px' }}>
                        {room.total_sessions} session(s) sur {room.days_range} jour(s)
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {occupationData.rooms.length === 0 && (
                <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
                  Aucune salle active trouvée.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
      <div style={{
        width: '36px', height: '36px', border: '3px solid #e2e8f0',
        borderTop: '3px solid #01696f', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const thStyle = {
  background: '#f1f5f9', border: '1px solid #e2e8f0',
  padding: '8px 10px', fontWeight: 700, fontSize: '0.82rem',
  color: '#475569', textAlign: 'center'
};

const tdStyle = {
  border: '1px solid #e2e8f0', padding: '6px 8px',
  textAlign: 'center', fontSize: '0.82rem', color: '#334155'
};

const navBtnStyle = {
  background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '7px',
  padding: '6px 14px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', color: '#334155'
};

const labelStyle = {
  display: 'flex', alignItems: 'center', gap: '6px',
  fontWeight: 600, fontSize: '0.88rem', color: '#475569'
};

const inputStyle = {
  border: '1px solid #cbd5e1', borderRadius: '7px',
  padding: '6px 10px', fontSize: '0.88rem', color: '#1e293b'
};
