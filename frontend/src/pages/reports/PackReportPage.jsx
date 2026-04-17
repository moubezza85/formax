import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { reportService } from '../../services/api';
import { Package, BookOpen, Users, DollarSign, ArrowLeft, Info } from 'lucide-react';

export default function PackReportPage() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportService.getPackReport(id).then(data => {
      setReport(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-3 text-center text-muted">Chargement du rapport pack...</div>;
  if (!report || report?.error) return <div className="p-3 text-error text-center">{report?.error || 'Erreur de chargement'}</div>;

  const { pack, summary, trainings, enrollments } = report;

  const totalBrut = trainings?.reduce((s, t) => s + (t.price ?? 0), 0) ?? 0;
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
            <h1 className="text-2xl font-bold">{pack.name}</h1>
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
        {/* CA Généré — kpi-teal */}
        <div className="card kpi-card kpi-teal flex flex-col justify-between">
          <h3 className="text-sm font-bold uppercase mb-1" style={{opacity:0.85}}>CA Généré</h3>
          <div className="text-3xl font-bold">{(summary?.total_revenue ?? 0).toLocaleString()} MAD</div>
          <div className="text-xs mt-1" style={{opacity:0.85}}>Remise appliquée : {discountPct}%</div>
        </div>

        {/* Ventes — kpi-primary */}
        <div className="card kpi-card kpi-primary flex flex-col justify-between">
          <h3 className="text-sm font-bold uppercase mb-1" style={{opacity:0.85}}>Ventes (Unités)</h3>
          <div className="text-3xl font-bold">{summary?.enrollment_count ?? 0}</div>
          <div className="text-xs mt-1" style={{opacity:0.85}}>Acheteurs uniques</div>
        </div>

        {/* Formations — kpi-indigo */}
        <div className="card kpi-card kpi-indigo flex flex-col justify-between">
          <h3 className="text-sm font-bold uppercase mb-1" style={{opacity:0.85}}>Formations Incluses</h3>
          <div className="text-3xl font-bold">{trainings?.length ?? 0}</div>
          <div className="text-xs mt-1" style={{opacity:0.85}}>Prix brut : {totalBrut.toLocaleString()} MAD</div>
        </div>
      </div>

      {/* Description */}
      {pack.description && (
        <div className="card mb-2 p-1-5 flex gap-1-5 items-start" style={{background:'#e7f3ff', border:'1px dashed var(--primary)'}}>
          <div className="p-1 rounded-full bg-white text-primary"><Info size={24} /></div>
          <div>
            <h3 className="font-bold text-primary mb-0-5">Description du Pack</h3>
            <p className="text-sm leading-relaxed" style={{color:'#1a3c6e'}}>{pack.description}</p>
          </div>
        </div>
      )}

      {/* Formations + Inscriptions */}
      <div className="grid grid-2 gap-2">
        <div>
          <h2 className="mb-1 flex items-center gap-0-5"><BookOpen size={20} /> Formations du Pack</h2>
          <div className="flex flex-col gap-1">
            {(trainings ?? []).length === 0 && (
              <p className="card p-2 text-center text-muted">Aucune formation dans ce pack.</p>
            )}
            {(trainings ?? []).map(t => (
              <div key={t.id} className="card p-1-5 flex justify-between items-center transition-all">
                <div>
                  <div className="font-bold">{t.title}</div>
                  <div className="text-xs text-muted">{t.total_hours ?? t.masse_horaire ?? 0}h de formation</div>
                </div>
                <div className="text-lg font-bold text-primary">{(t.price ?? 0).toLocaleString()} MAD</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-1 flex items-center gap-0-5"><Users size={20} /> Inscriptions</h2>
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-glass">
                <tr>
                  <th className="p-1-5 text-xs uppercase text-muted">Étudiant</th>
                  <th className="p-1-5 text-xs uppercase text-muted">Statut</th>
                  <th className="p-1-5 text-xs uppercase text-muted text-right">Prix Appliqué</th>
                </tr>
              </thead>
              <tbody>
                {(enrollments ?? []).length === 0 && (
                  <tr><td colSpan="3" className="p-3 text-center text-muted">Aucun étudiant inscrit.</td></tr>
                )}
                {(enrollments ?? []).map((e, i) => (
                  <tr key={i} className="border-t border-surface-border">
                    <td className="p-1-5 font-bold">Étudiant #{e.student_id}</td>
                    <td className="p-1-5">
                      <span className={`badge ${e.status === 'active' ? 'badge-success' : 'badge-secondary'}`}>
                        {e.status || 'actif'}
                      </span>
                    </td>
                    <td className="p-1-5 text-right font-bold text-success">
                      {(e.final_price ?? 0).toLocaleString()} MAD
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
