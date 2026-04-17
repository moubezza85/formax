import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { reportService, userService, trainingService, packService } from '../../services/api';
import {
  BookOpen, Users, GraduationCap, Package,
  TrendingUp, AlertCircle, ExternalLink, BarChart2
} from 'lucide-react';

export default function ReportsPage() {
  const navigate = useNavigate();
  const [trainings, setTrainings] = useState([]);
  const [students, setStudents] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [packs, setPacks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('formations');

  useEffect(() => {
    Promise.all([
      trainingService.getTrainings(),
      userService.getStudents(),
      userService.getTrainers(),
      packService.getPacks(),
      reportService.getDashboardStats(),
    ]).then(([t, s, tr, p, st]) => {
      setTrainings(t.filter(x => !x.is_deleted));
      setStudents(s.filter(x => !x.is_deleted));
      setTrainers(tr.filter(x => !x.is_deleted));
      setPacks(p.filter(x => !x.is_deleted));
      setStats(st);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const tabs = [
    { key: 'formations', label: 'Formations', icon: BookOpen, count: trainings.length },
    { key: 'students',   label: '\u00c9tudiants',  icon: Users,   count: students.length },
    { key: 'trainers',  label: 'Formateurs', icon: GraduationCap, count: trainers.length },
    { key: 'packs',     label: 'Packs',      icon: Package,  count: packs.length },
  ];

  const STATUS_COLORS = {
    active: 'badge-success',
    draft: 'badge-secondary',
    completed: 'badge-primary',
  };
  const STATUS_LABELS = { active: 'Active', draft: 'Brouillon', completed: 'Termin\u00e9e' };

  if (loading) return <div className="p-3 text-center text-muted">Chargement des rapports...</div>;

  return (
    <div className="container p-0 fade-in">
      <div className="flex items-center gap-1 mb-2">
        <BarChart2 size={24} className="text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Rapports &amp; Analyses</h1>
          <p className="text-muted">Vue globale \u2014 cliquez sur une ligne pour acc\u00e9der au rapport d\u00e9taill\u00e9</p>
        </div>
      </div>

      {stats && (
        <div className="grid grid-4 gap-1-5 mb-2">
          <div className="card kpi-card kpi-primary flex flex-col justify-between">
            <h3 className="text-sm font-bold uppercase mb-1" style={{opacity:0.85}}>CA Total</h3>
            <div className="text-3xl font-bold">{(stats.revenue ?? 0).toLocaleString()} MAD</div>
          </div>
          <div className="card kpi-card kpi-success flex flex-col justify-between">
            <h3 className="text-sm font-bold uppercase mb-1" style={{opacity:0.85}}>B\u00e9n\u00e9fice Net</h3>
            <div className="text-3xl font-bold">{(stats.profit ?? 0).toLocaleString()} MAD</div>
          </div>
          <div className="card kpi-card kpi-teal flex flex-col justify-between">
            <h3 className="text-sm font-bold uppercase mb-1" style={{opacity:0.85}}>\u00c9tudiants</h3>
            <div className="text-3xl font-bold">{stats.studentCount ?? 0}</div>
          </div>
          <div className="card kpi-card kpi-warning flex flex-col justify-between">
            <h3 className="text-sm font-bold uppercase mb-1" style={{opacity:0.85}}>Formations Actives</h3>
            <div className="text-3xl font-bold">{stats.trainingCount ?? 0}</div>
          </div>
        </div>
      )}

      {stats?.debtors?.length > 0 && (
        <div className="card mb-2 p-1-5" style={{background:'rgba(255,160,0,0.06)', border:'1px dashed var(--warning, #f59e0b)'}}>
          <div className="flex items-center gap-0-5 mb-1">
            <AlertCircle size={16} className="text-warning" />
            <span className="text-sm font-bold text-warning">Top d\u00e9biteurs</span>
          </div>
          <div style={{display:'flex', flexWrap:'wrap', gap:'0.5rem'}}>
            {stats.debtors.map((d, i) => (
              <span key={i} className="badge badge-warning">
                {d.student_name} \u2014 {(d.remaining_balance).toLocaleString()} MAD
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-0-5 mb-1-5" style={{borderBottom:'2px solid var(--surface-border)'}}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`btn ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}
            style={{borderRadius:'6px 6px 0 0', borderBottom: tab === t.key ? '2px solid var(--primary)' : '2px solid transparent', marginBottom:'-2px'}}
          >
            <t.icon size={15} />
            {t.label}
            <span className="badge badge-secondary" style={{marginLeft:'0.3rem'}}>{t.count}</span>
          </button>
        ))}
      </div>

      {tab === 'formations' && (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-glass">
              <tr>
                <th className="p-1 text-xs uppercase text-muted">Titre</th>
                <th className="p-1 text-xs uppercase text-muted">Statut</th>
                <th className="p-1 text-xs uppercase text-muted text-right">Prix</th>
                <th className="p-1 text-xs uppercase text-muted">Rapport</th>
              </tr>
            </thead>
            <tbody>
              {trainings.length === 0 && (
                <tr><td colSpan="4" className="p-2 text-center text-muted">Aucune formation.</td></tr>
              )}
              {trainings.map(t => (
                <tr key={t.id} className="border-t border-surface-border hover-row" style={{cursor:'pointer'}} onClick={() => navigate(`/reports/training/${t.id}`)}>
                  <td className="p-1 font-bold text-sm">{t.title}</td>
                  <td className="p-1"><span className={`badge ${STATUS_COLORS[t.status] || 'badge-secondary'}`}>{STATUS_LABELS[t.status] || t.status}</span></td>
                  <td className="p-1 text-right font-bold">{(t.price ?? 0).toLocaleString()} MAD</td>
                  <td className="p-1"><button className="btn-icon" onClick={e => { e.stopPropagation(); navigate(`/reports/training/${t.id}`); }}><ExternalLink size={15} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'students' && (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-glass">
              <tr>
                <th className="p-1 text-xs uppercase text-muted">Nom</th>
                <th className="p-1 text-xs uppercase text-muted">Email</th>
                <th className="p-1 text-xs uppercase text-muted">Sp\u00e9cialit\u00e9</th>
                <th className="p-1 text-xs uppercase text-muted">Rapport</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 && (
                <tr><td colSpan="4" className="p-2 text-center text-muted">Aucun \u00e9tudiant.</td></tr>
              )}
              {students.map(s => (
                <tr key={s.id} className="border-t border-surface-border hover-row" style={{cursor:'pointer'}} onClick={() => navigate(`/reports/student/${s.id}`)}>
                  <td className="p-1 font-bold text-sm">{s.user?.first_name} {s.user?.last_name}</td>
                  <td className="p-1 text-muted text-sm">{s.user?.email}</td>
                  <td className="p-1 text-sm">{s.specialty || '\u2014'}</td>
                  <td className="p-1"><button className="btn-icon" onClick={e => { e.stopPropagation(); navigate(`/reports/student/${s.id}`); }}><ExternalLink size={15} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'trainers' && (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-glass">
              <tr>
                <th className="p-1 text-xs uppercase text-muted">Nom</th>
                <th className="p-1 text-xs uppercase text-muted">Sp\u00e9cialit\u00e9</th>
                <th className="p-1 text-xs uppercase text-muted">Mode honoraire</th>
                <th className="p-1 text-xs uppercase text-muted">Rapport</th>
              </tr>
            </thead>
            <tbody>
              {trainers.length === 0 && (
                <tr><td colSpan="4" className="p-2 text-center text-muted">Aucun formateur.</td></tr>
              )}
              {trainers.map(t => (
                <tr key={t.id} className="border-t border-surface-border hover-row" style={{cursor:'pointer'}} onClick={() => navigate(`/reports/trainer/${t.id}`)}>
                  <td className="p-1 font-bold text-sm">{t.user?.first_name} {t.user?.last_name}</td>
                  <td className="p-1 text-sm">{t.specialty || '\u2014'}</td>
                  <td className="p-1"><span className="badge badge-secondary">{{ hourly: 'Par heure', per_student: 'Par \u00e9tudiant', fixed: 'Forfait', monthly: 'Mensuel' }[t.default_payment_mode] || t.default_payment_mode}</span></td>
                  <td className="p-1"><button className="btn-icon" onClick={e => { e.stopPropagation(); navigate(`/reports/trainer/${t.id}`); }}><ExternalLink size={15} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'packs' && (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-glass">
              <tr>
                <th className="p-1 text-xs uppercase text-muted">Nom du pack</th>
                <th className="p-1 text-xs uppercase text-muted">R\u00e9duction</th>
                <th className="p-1 text-xs uppercase text-muted">Formations</th>
                <th className="p-1 text-xs uppercase text-muted">Rapport</th>
              </tr>
            </thead>
            <tbody>
              {packs.length === 0 && (
                <tr><td colSpan="4" className="p-2 text-center text-muted">Aucun pack.</td></tr>
              )}
              {packs.map(p => (
                <tr key={p.id} className="border-t border-surface-border hover-row" style={{cursor:'pointer'}} onClick={() => navigate(`/reports/pack/${p.id}`)}>
                  <td className="p-1 font-bold text-sm">{p.name}</td>
                  <td className="p-1"><span className="badge badge-success">-{((p.discount_rate ?? 0) * 100).toFixed(0)}%</span></td>
                  <td className="p-1 text-sm text-muted">{(p.trainings ?? []).length} formation(s)</td>
                  <td className="p-1"><button className="btn-icon" onClick={e => { e.stopPropagation(); navigate(`/reports/pack/${p.id}`); }}><ExternalLink size={15} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
