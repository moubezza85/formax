import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { reportService } from '../../services/api';
import { Package, BookOpen, Users, ArrowLeft, Info, ExternalLink, TrendingUp } from 'lucide-react';

export default function PackReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportService.getPackReport(id)
      .then(data => { setReport(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-3 text-center text-muted">Chargement du rapport pack...</div>;
  if (!report || report?.error) return <div className="p-3 text-error text-center">{report?.error || 'Erreur de chargement'}</div>;

  const { pack, summary, trainings, enrollments } = report;
  const totalBrut = (trainings ?? []).reduce((s, t) => s + (t.price ?? 0), 0);
  const discountPct = ((pack.discount_rate ?? 0) * 100).toFixed(0);

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
              <Package size={20} className="text-primary" />
              <h1 className="text-2xl font-bold">{pack.name}</h1>
            </div>
            <p className="text-muted">Analyse de performance commerciale</p>
          </div>
        </div>
        {discountPct > 0 && (
          <span className="badge badge-success" style={{padding:'0.4rem 0.8rem', fontSize:'0.85rem'}}>
            -{discountPct}% remise pack
          </span>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-3 gap-1-5 mb-2">
        <div className="card kpi-card kpi-teal flex flex-col justify-between">
          <h3 className="text-sm font-bold uppercase mb-1" style={{opacity:0.85}}>CA Généré</h3>
          <div className="text-3xl font-bold">{(summary?.total_revenue ?? 0).toLocaleString()} MAD</div>
          <div className="text-xs mt-1" style={{opacity:0.85}}>Remise : -{discountPct}% appliquée</div>
        </div>
        <div className="card kpi-card kpi-primary flex flex-col justify-between">
          <h3 className="text-sm font-bold uppercase mb-1" style={{opacity:0.85}}>Ventes</h3>
          <div className="text-3xl font-bold">{summary?.enrollment_count ?? 0}</div>
          <div className="text-xs mt-1" style={{opacity:0.85}}>Étudiants inscrits</div>
        </div>
        <div className="card kpi-card kpi-indigo flex flex-col justify-between">
          <h3 className="text-sm font-bold uppercase mb-1" style={{opacity:0.85}}>Formations Incluses</h3>
          <div className="text-3xl font-bold">{(trainings ?? []).length}</div>
          <div className="text-xs mt-1" style={{opacity:0.85}}>Prix brut : {totalBrut.toLocaleString()} MAD</div>
        </div>
      </div>

      {/* Description */}
      {pack.description && (
        <div className="card mb-2 p-1-5 flex gap-1 items-start" style={{background:'rgba(0,100,200,0.05)', border:'1px dashed var(--primary)'}}>
          <Info size={20} className="text-primary" style={{flexShrink:0, marginTop:'2px'}} />
          <div>
            <h3 className="font-bold text-primary mb-0-5">Description du Pack</h3>
            <p className="text-sm leading-relaxed">{pack.description}</p>
          </div>
        </div>
      )}

      {/* Formations + Inscriptions */}
      <div className="grid grid-2 gap-2">
        {/* Formations */}
        <div>
          <h2 className="mb-1 flex items-center gap-0-5"><BookOpen size={20} /> Formations du Pack</h2>
          <div className="flex flex-col gap-1">
            {(trainings ?? []).length === 0 && (
              <p className="card p-2 text-center text-muted">Aucune formation dans ce pack.</p>
            )}
            {(trainings ?? []).map(t => (
              <div key={t.id} className="card p-1-5 flex justify-between items-center transition-all">
                <div>
                  <div className="font-bold text-sm">{t.title}</div>
                  <div className="flex items-center gap-0-5 mt-0-25">
                    <span className={`badge ${
                      t.status === 'active' ? 'badge-success' :
                      t.status === 'completed' ? 'badge-primary' : 'badge-secondary'
                    }`} style={{fontSize:'0.7rem'}}>
                      {t.status === 'active' ? 'Active' : t.status === 'completed' ? 'Terminée' : 'Brouillon'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-0-5">
                  <div className="text-lg font-bold text-primary">{(t.price ?? 0).toLocaleString()} MAD</div>
                  <button
                    className="btn-icon"
                    title="Voir rapport formation"
                    onClick={() => navigate(`/reports/training/${t.id}`)}
                  >
                    <ExternalLink size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Inscriptions */}
        <div>
          <h2 className="mb-1 flex items-center gap-0-5"><Users size={20} /> Inscriptions</h2>
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-glass">
                <tr>
                  <th className="p-1 text-xs uppercase text-muted">Étudiant</th>
                  <th className="p-1 text-xs uppercase text-muted">Statut</th>
                  <th className="p-1 text-xs uppercase text-muted text-right">Solde</th>
                  <th className="p-1 text-xs uppercase text-muted"></th>
                </tr>
              </thead>
              <tbody>
                {(enrollments ?? []).length === 0 && (
                  <tr><td colSpan="4" className="p-3 text-center text-muted">Aucun étudiant inscrit.</td></tr>
                )}
                {(enrollments ?? []).map((e, i) => (
                  <tr key={i} className="border-t border-surface-border">
                    <td className="p-1 font-bold text-sm">{e.student_name || `Étudiant #${e.student_id}`}</td>
                    <td className="p-1">
                      <span className={`badge ${e.status === 'active' ? 'badge-success' : 'badge-secondary'}`}>
                        {e.status || 'actif'}
                      </span>
                    </td>
                    <td className="p-1 text-right">
                      <span className={`font-bold text-sm ${(e.balance ?? 0) > 0 ? 'text-warning' : 'text-success'}`}>
                        {(e.balance ?? 0) > 0 ? `${e.balance.toLocaleString()} MAD` : '✓ Soldé'}
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
