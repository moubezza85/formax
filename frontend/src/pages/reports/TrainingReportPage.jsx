import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { reportService } from '../../services/api';
import {
  BookOpen, Users, TrendingUp, ArrowLeft,
  CreditCard, GraduationCap, ExternalLink, AlertCircle
} from 'lucide-react';

const MODE_LABELS = {
  hourly: 'Par heure',
  per_student: 'Par étudiant',
  fixed: 'Forfait',
  monthly: 'Mensualité',
};

const STATUS_LABELS = { draft: 'Brouillon', active: 'Active', completed: 'Terminée' };

export default function TrainingReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportService.getFormationReport(id)
      .then(data => { setReport(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-3 text-center text-muted">Chargement du rapport formation...</div>;
  if (!report || report?.error) return <div className="p-3 text-error text-center">{report?.error || 'Erreur de chargement'}</div>;

  const { training, summary, trainers, enrollments } = report;
  const rentabilite = summary.total_revenue > 0
    ? ((summary.net_margin / summary.total_revenue) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="container p-0 fade-in">
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-1">
          <button className="btn-icon bg-glass" onClick={() => window.history.back()}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-0-5">
              <BookOpen size={20} className="text-primary" />
              <h1 className="text-2xl font-bold">{training.title}</h1>
            </div>
            <p className="text-muted">Analyse financière &amp; opérationnelle</p>
          </div>
        </div>
        <span className={`badge ${
          training.status === 'active' ? 'badge-success' :
          training.status === 'completed' ? 'badge-primary' : 'badge-secondary'
        }`} style={{padding:'0.4rem 0.8rem', fontSize:'0.85rem'}}>
          {STATUS_LABELS[training.status] || training.status}
        </span>
      </div>

      {/* KPI cards */}
      <div className="grid grid-4 gap-1-5 mb-2">
        <div className="card kpi-card kpi-primary flex flex-col justify-between">
          <h3 className="text-sm font-bold uppercase mb-1" style={{opacity:0.85}}>Inscriptions</h3>
          <div className="text-3xl font-bold">{summary.total_enrollments}</div>
          <div className="text-xs mt-1" style={{opacity:0.85}}>Étudiants inscrits</div>
        </div>

        <div className="card kpi-card kpi-success flex flex-col justify-between">
          <h3 className="text-sm font-bold uppercase mb-1" style={{opacity:0.85}}>Chiffre d'Affaires</h3>
          <div className="text-3xl font-bold">{(summary.total_revenue ?? 0).toLocaleString()} MAD</div>
          <div className="text-xs mt-1" style={{opacity:0.85}}>Encaissé : {(summary.total_paid ?? 0).toLocaleString()} MAD</div>
        </div>

        <div className="card kpi-card kpi-warning flex flex-col justify-between">
          <h3 className="text-sm font-bold uppercase mb-1" style={{opacity:0.85}}>Coûts Formateurs</h3>
          <div className="text-3xl font-bold">{(summary.trainer_costs ?? 0).toLocaleString()} MAD</div>
          <div className="text-xs mt-1" style={{opacity:0.85}}>Honoraires calculés</div>
        </div>

        <div className={`card kpi-card flex flex-col justify-between ${
          summary.net_margin >= 0 ? 'kpi-teal' : 'kpi-error'
        }`}>
          <h3 className="text-sm font-bold uppercase mb-1" style={{opacity:0.85}}>Marge Nette</h3>
          <div className="text-3xl font-bold">{(summary.net_margin ?? 0).toLocaleString()} MAD</div>
          <div className="text-xs mt-1" style={{opacity:0.85}}>Rentabilité : {rentabilite}%</div>
        </div>
      </div>

      {/* Reste à encaisser */}
      {summary.remaining > 0 && (
        <div className="card mb-2 p-1-5 flex gap-1 items-center" style={{background:'rgba(255,160,0,0.08)', border:'1px dashed var(--warning, #f59e0b)'}}>
          <AlertCircle size={20} className="text-warning" style={{flexShrink:0}} />
          <p className="text-sm">
            Reste à encaisser : <span className="font-bold text-warning">{(summary.remaining).toLocaleString()} MAD</span>
          </p>
        </div>
      )}

      {/* Formateurs + Étudiants */}
      <div className="grid grid-2 gap-2">
        {/* Formateurs */}
        <div>
          <h2 className="mb-1 flex items-center gap-0-5"><GraduationCap size={20} /> Équipe Pédagogique</h2>
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-glass">
                <tr>
                  <th className="p-1 text-xs uppercase text-muted">Formateur</th>
                  <th className="p-1 text-xs uppercase text-muted">Mode</th>
                  <th className="p-1 text-xs uppercase text-muted text-right">Honoraires</th>
                  <th className="p-1 text-xs uppercase text-muted"></th>
                </tr>
              </thead>
              <tbody>
                {(trainers ?? []).length === 0 && (
                  <tr><td colSpan="4" className="p-2 text-center text-muted">Aucun formateur assigné.</td></tr>
                )}
                {(trainers ?? []).map((t, i) => (
                  <tr key={i} className="border-t border-surface-border">
                    <td className="p-1 font-bold text-sm">{t.name}</td>
                    <td className="p-1">
                      <span className="badge badge-secondary">{MODE_LABELS[t.mode] || t.mode}</span>
                    </td>
                    <td className="p-1 text-right font-bold text-primary">{(t.expected ?? 0).toLocaleString()} MAD</td>
                    <td className="p-1">
                      <button
                        className="btn-icon"
                        title="Voir fiche formateur"
                        onClick={() => navigate(`/reports/trainer/${t.trainer_id}`)}
                      >
                        <ExternalLink size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Étudiants inscrits */}
        <div>
          <h2 className="mb-1 flex items-center gap-0-5"><Users size={20} /> État des Inscriptions</h2>
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-glass">
                <tr>
                  <th className="p-1 text-xs uppercase text-muted">Étudiant</th>
                  <th className="p-1 text-xs uppercase text-muted">Réduction</th>
                  <th className="p-1 text-xs uppercase text-muted text-right">Solde</th>
                  <th className="p-1 text-xs uppercase text-muted"></th>
                </tr>
              </thead>
              <tbody>
                {(enrollments ?? []).length === 0 && (
                  <tr><td colSpan="4" className="p-2 text-center text-muted">Aucun étudiant inscrit.</td></tr>
                )}
                {(enrollments ?? []).map((e, i) => (
                  <tr key={i} className="border-t border-surface-border">
                    <td className="p-1 font-bold text-sm">{e.student_name || `Étudiant #${e.student_id}`}</td>
                    <td className="p-1">
                      {e.discount_rate > 0
                        ? <span className="badge badge-success">-{(e.discount_rate * 100).toFixed(0)}%</span>
                        : <span className="badge badge-secondary">0%</span>}
                    </td>
                    <td className="p-1 text-right">
                      <span className={`font-bold text-sm ${(e.balance ?? 0) > 0 ? 'text-warning' : 'text-success'}`}>
                        {(e.balance ?? 0) > 0 ? `${(e.balance).toLocaleString()} MAD` : '✓ Soldé'}
                      </span>
                    </td>
                    <td className="p-1">
                      <button
                        className="btn-icon"
                        title="Voir fiche étudiant"
                        onClick={() => navigate(`/reports/student/${e.student_id}`)}
                      >
                        <ExternalLink size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
