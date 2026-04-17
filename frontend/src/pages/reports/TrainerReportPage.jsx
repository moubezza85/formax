import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { reportService, userService } from '../../services/api';
import { Briefcase, DollarSign, ArrowLeft, Clock, CheckCircle, Users } from 'lucide-react';

const MODE_LABELS = {
  hourly: 'Par heure',
  per_student: 'Par étudiant',
  fixed: 'Forfait',
  monthly: 'Mensualité',
};

export default function TrainerReportPage() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [trainerInfo, setTrainerInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      reportService.getTrainerReport(id),
      userService.getTrainers().catch(() => []),
    ]).then(([reportData, trainers]) => {
      setReport(reportData);
      // Trouver le formateur dans la liste pour avoir user.first_name
      const found = trainers.find(t => String(t.id) === String(id));
      setTrainerInfo(found || null);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div className="p-3 text-center text-muted">Chargement du rapport formateur...</div>;
  if (report?.error) return <div className="p-3 text-error text-center">{report.error}</div>;

  const { trainer, summary, activities, payments } = report;

  // Nom : priorité trainerInfo (liste enrichie) > report.trainer.user > report.trainer
  const usr = trainerInfo?.user || trainer?.user || trainer || {};
  const fullName = (usr.first_name && usr.last_name)
    ? `${usr.first_name} ${usr.last_name}`
    : (trainerInfo ? `${trainerInfo.user?.first_name || ''} ${trainerInfo.user?.last_name || ''}`.trim() : `Formateur #${id}`);

  const specialty = trainerInfo?.specialty || trainer?.specialty || '';
  const level = trainerInfo?.level || trainer?.level || '';

  return (
    <div className="container p-0 fade-in">
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-1">
          <button className="btn-icon bg-glass" onClick={() => window.history.back()}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold">{fullName}</h1>
            <p className="text-muted">
              Rapport d'activité &amp; Honoraires
              {specialty && <span className="ml-1 badge badge-secondary">{specialty}</span>}
              {level && <span className="ml-1 badge badge-primary">Niv. {level}</span>}
            </p>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-3 gap-1-5 mb-2">
        {/* Reste à percevoir — kpi-warning */}
        <div className="card kpi-card kpi-warning flex flex-col justify-between">
          <h3 className="text-sm font-bold uppercase mb-1" style={{opacity:0.85}}>Reste à percevoir</h3>
          <div className="text-3xl font-bold">{(summary.balance ?? 0).toLocaleString()} MAD</div>
          <div className="text-xs mt-1" style={{opacity:0.85}}>Total cumulé : {(summary.total_earned ?? 0).toLocaleString()} MAD</div>
        </div>

        {/* Honoraires réglés — kpi-success */}
        <div className="card kpi-card kpi-success flex flex-col justify-between">
          <h3 className="text-sm font-bold uppercase mb-1" style={{opacity:0.85}}>Honoraires Réglés</h3>
          <div className="text-3xl font-bold">{(summary.total_paid ?? 0).toLocaleString()} MAD</div>
          <div className="text-xs mt-1" style={{opacity:0.85}}>{payments.length} versement(s) effectué(s)</div>
        </div>

        {/* Missions — kpi-indigo */}
        <div className="card kpi-card kpi-indigo flex flex-col justify-between">
          <h3 className="text-sm font-bold uppercase mb-1" style={{opacity:0.85}}>Missions Actives</h3>
          <div className="text-3xl font-bold">{activities.length}</div>
          <div className="text-xs mt-1" style={{opacity:0.85}}>Formations assignées</div>
        </div>
      </div>

      {/* Détail missions + historique */}
      <div className="grid grid-3 gap-2">
        <div className="col-span-2">
          <h2 className="mb-1 flex items-center gap-0-5"><Briefcase size={20} /> Détail par Mission</h2>
          <div className="flex flex-col gap-1">
            {activities.length === 0 && (
              <p className="card p-3 text-center text-muted">Aucune activité enregistrée.</p>
            )}
            {activities.map((a, i) => (
              <div key={i} className="card p-1-5" style={{borderLeft:'4px solid var(--primary)'}}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold">{a.training_title}</h3>
                    <div className="flex flex-wrap gap-0-5 mt-0-5">
                      <span className="badge badge-primary">{MODE_LABELS[a.calculation?.mode] || a.calculation?.mode}</span>
                      {a.calculation?.total_hours !== undefined && (
                        <span className="badge badge-secondary flex items-center gap-0-25">
                          <Clock size={12} /> {a.calculation.total_hours}h réalisées
                        </span>
                      )}
                      {a.calculation?.student_count !== undefined && (
                        <span className="badge badge-secondary flex items-center gap-0-25">
                          <Users size={12} /> {a.calculation.student_count} inscrits
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-primary">{(a.earned ?? 0).toLocaleString()} MAD</div>
                    {a.calculation?.rate !== undefined && (
                      <div className="text-xs text-muted">Tarif : {a.calculation.rate} MAD</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-1 flex items-center gap-0-5"><DollarSign size={20} /> Historique Versements</h2>
          <div className="card p-0 overflow-hidden">
            {payments.length === 0 && (
              <p className="p-2 text-center text-muted text-sm">Aucun versement.</p>
            )}
            {payments.map(p => (
              <div key={p.id} className="p-1 border-t border-surface-border flex justify-between items-center">
                <div>
                  <div className="font-bold text-sm">{(p.amount ?? 0).toLocaleString()} MAD</div>
                  <div className="text-xs text-muted">{new Date(p.date).toLocaleDateString('fr-FR')}</div>
                </div>
                <CheckCircle size={16} className="text-success" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
