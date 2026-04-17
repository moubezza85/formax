import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { reportService } from '../../services/api';
import { User, GraduationCap, DollarSign, ArrowLeft, Briefcase, Clock, Calendar, CheckCircle, TrendingUp } from 'lucide-react';

export default function TrainerReportPage() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportService.getTrainerReport(id).then(data => {
      setReport(data);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div className="p-3 text-center text-muted">Chargement de l'activité du formateur...</div>;
  if (report?.error) return <div className="p-3 text-error text-center">{report.error}</div>;

  const { trainer, summary, activities, payments } = report;
  const user = trainer.user || {};

  return (
    <div className="container p-0 fade-in">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-1">
          <button className="btn-icon bg-glass" onClick={() => window.history.back()}><ArrowLeft size={20} /></button>
          <div>
            <h1 className="text-2xl font-bold">{user.first_name} {user.last_name}</h1>
            <p className="text-muted">Rapport d'activité et Honoraires</p>
          </div>
        </div>
      </div>

      <div className="grid grid-3 gap-1-5 mb-2">
         <div className="card bg-warning text-white p-1-5 flex flex-col justify-between">
            <h3 className="text-sm font-bold opacity-80 uppercase mb-1">Reste à percevoir</h3>
            <div className="text-3xl font-bold">{summary.balance.toLocaleString()} MAD</div>
            <div className="text-xs mt-1 opacity-80">Total Cumulé : {summary.total_earned.toLocaleString()} MAD</div>
         </div>
         <div className="card p-1-5">
            <h3 className="text-sm font-bold text-muted uppercase mb-1">Honoraires Réglés</h3>
            <div className="text-2xl font-bold text-success">{summary.total_paid.toLocaleString()} MAD</div>
            <div className="text-xs text-muted mt-0-5">{payments.length} versements effectués</div>
         </div>
         <div className="card p-1-5">
            <h3 className="text-sm font-bold text-muted uppercase mb-1">Missions Actives</h3>
            <div className="text-2xl font-bold">{activities.length}</div>
            <p className="text-xs text-muted mt-0-5">Formations assignées</p>
         </div>
      </div>

      <div className="grid grid-3 gap-2">
        <div className="col-span-2">
          <h2 className="mb-1 flex items-center gap-0-5"><Briefcase size={20} /> Détail par Mission</h2>
          <div className="flex flex-col gap-1">
             {activities.map((a, i) => (
                <div key={i} className="card p-1-5 border-l-4 border-primary">
                   <div className="flex justify-between items-start">
                      <div>
                         <h3 className="text-lg font-bold">{a.training_title}</h3>
                         <div className="flex gap-1 mt-0-5">
                            <span className="tag text-xs">{a.calculation.mode}</span>
                            {a.calculation.total_hours !== undefined && <span className="text-xs font-bold text-muted flex items-center gap-0-5"><Clock size={12} /> {a.calculation.total_hours}h réalisées</span>}
                            {a.calculation.student_count !== undefined && <span className="text-xs font-bold text-muted flex items-center gap-0-5"><Users size={12} /> {a.calculation.student_count} inscrits</span>}
                         </div>
                      </div>
                      <div className="text-right">
                         <div className="text-xl font-bold text-primary">{a.earned.toLocaleString()} MAD</div>
                         <div className="text-xs text-muted">Tarif appliqué: {a.calculation.rate} MAD</div>
                      </div>
                   </div>
                </div>
             ))}
             {activities.length === 0 && <p className="p-3 text-center text-muted">Aucune activité enregistrée sur la période.</p>}
          </div>
        </div>

        <div>
          <h2 className="mb-1 flex items-center gap-0-5"><DollarSign size={20} /> Historique des Versements</h2>
          <div className="card p-0 overflow-hidden">
             {payments.map(p => (
                <div key={p.id} className="p-1 border-b border-surface-border last:border-0 hover:bg-glass flex justify-between items-center">
                   <div>
                      <div className="font-bold text-sm">{p.amount.toLocaleString()} MAD</div>
                      <div className="text-xs text-muted">{new Date(p.date).toLocaleDateString()}</div>
                   </div>
                   <div className="text-success"><CheckCircle size={16} /></div>
                </div>
             ))}
             {payments.length === 0 && <p className="p-2 text-center text-muted text-sm">Aucun versement historique.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
