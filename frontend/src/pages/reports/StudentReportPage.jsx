import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { reportService } from '../../services/api';
import { BookOpen, ArrowLeft, History, Mail, Phone, ExternalLink, ShieldCheck, User as UserIcon } from 'lucide-react';

const PAYMENT_TYPE_LABELS = {
  full: 'Comptant',
  monthly: 'Mensuel',
  installment: 'Tranche',
  flexible: 'Libre',
};

const PAYMENT_MODE_LABELS = {
  full: 'Comptant',
  monthly: 'Mensuel',
  installment: 'Par tranches',
  flexible: 'À volonté',
};

export default function StudentReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportService.getStudentReport(id)
      .then(data => { setReport(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-3 text-center text-muted">Chargement de la fiche étudiant...</div>;
  if (!report || report?.error) return <div className="p-3 text-error text-center">{report?.error || 'Erreur de chargement'}</div>;

  const { student, summary, enrollments, payments } = report;

  // Le backend retourne maintenant first_name / last_name directement dans student
  const firstName = student?.first_name || '';
  const lastName = student?.last_name || '';
  const fullName = (firstName || lastName)
    ? `${firstName} ${lastName}`.trim()
    : `Étudiant #${id}`;

  const addedAt = student?.added_at || student?.created_at;

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
              <UserIcon size={20} className="text-primary" />
              <h1 className="text-2xl font-bold">{fullName}</h1>
            </div>
            <p className="text-muted">Fiche Étudiant &amp; Historique Financier</p>
          </div>
        </div>
        <div className="badge badge-success flex items-center gap-0-5" style={{padding:'0.4rem 0.8rem', fontSize:'0.85rem'}}>
          <ShieldCheck size={16} /> Profil Vérifié
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-3 gap-1-5 mb-2">
        {/* Reste à payer */}
        <div className={`card kpi-card ${(summary?.balance ?? 0) > 0 ? 'kpi-warning' : 'kpi-success'} flex flex-col justify-between`}>
          <h3 className="text-sm font-bold uppercase mb-1" style={{opacity:0.85}}>Reste à payer</h3>
          <div className="text-3xl font-bold">{(summary?.balance ?? 0).toLocaleString()} MAD</div>
          <div className="text-xs mt-1" style={{opacity:0.85}}>Total facturé : {(summary?.total_invoiced ?? 0).toLocaleString()} MAD</div>
        </div>

        {/* Coordonnées */}
        <div className="card p-1-5">
          <h3 className="text-sm font-bold text-muted uppercase mb-1">Coordonnées</h3>
          <div className="flex flex-col gap-0-5">
            <div className="flex items-center gap-0-5 text-sm font-medium">
              <Mail size={16} className="text-primary" /> {student?.email || '—'}
            </div>
            <div className="flex items-center gap-0-5 text-sm font-medium">
              <Phone size={16} className="text-primary" /> {student?.phone || 'Non renseigné'}
            </div>
            {student?.parent_phone && (
              <div className="flex items-center gap-0-5 text-sm text-muted">
                <Phone size={14} /> Parent : {student.parent_phone}
              </div>
            )}
            {student?.specialty && (
              <span className="badge badge-secondary mt-0-5" style={{width:'fit-content'}}>{student.specialty}</span>
            )}
          </div>
        </div>

        {/* Inscriptions */}
        <div className="card kpi-card kpi-primary flex flex-col justify-between">
          <h3 className="text-sm font-bold uppercase mb-1" style={{opacity:0.85}}>Inscriptions</h3>
          <div className="text-3xl font-bold">{enrollments?.length ?? 0}</div>
          <div className="text-xs mt-1" style={{opacity:0.85}}>
            Ajouté le : {addedAt ? new Date(addedAt).toLocaleDateString('fr-FR') : '—'}
          </div>
        </div>
      </div>

      {/* Paiements + Formations */}
      <div className="grid grid-3 gap-2">
        {/* Historique paiements */}
        <div className="col-span-2">
          <h2 className="mb-1 flex items-center gap-0-5"><History size={20} /> Historique des Paiements</h2>
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-glass">
                <tr>
                  <th className="p-1 text-xs uppercase text-muted">Date</th>
                  <th className="p-1 text-xs uppercase text-muted">Type</th>
                  <th className="p-1 text-xs uppercase text-muted">Note / Réf</th>
                  <th className="p-1 text-xs uppercase text-muted text-right">Montant</th>
                </tr>
              </thead>
              <tbody>
                {(payments ?? []).length === 0 && (
                  <tr><td colSpan="4" className="p-2 text-center text-muted">Aucun paiement enregistré.</td></tr>
                )}
                {(payments ?? []).map(p => (
                  <tr key={p.id} className="border-t border-surface-border">
                    <td className="p-1 text-sm">{p.date ? new Date(p.date).toLocaleDateString('fr-FR') : '—'}</td>
                    <td className="p-1">
                      <span className="badge badge-primary">
                        {PAYMENT_TYPE_LABELS[p.payment_type] || p.payment_type || '—'}
                      </span>
                    </td>
                    <td className="p-1 text-sm text-muted">
                      {p.paid_by ? `[${p.paid_by}] ` : ''}{p.notes || '—'}
                    </td>
                    <td className="p-1 text-right font-bold text-success">+{(p.amount ?? 0).toLocaleString()} MAD</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Formations souscrites */}
        <div>
          <h2 className="mb-1 flex items-center gap-0-5"><BookOpen size={20} /> Formations Souscrites</h2>
          <div className="flex flex-col gap-1">
            {(enrollments ?? []).length === 0 && (
              <p className="card p-2 text-center text-muted text-sm">Aucune inscription.</p>
            )}
            {(enrollments ?? []).map(e => (
              <div key={e.id} className="card p-1-5 transition-all" style={{borderLeft:'4px solid var(--primary)'}}>
                <div className="flex justify-between items-start mb-0-5">
                  <span className="font-bold text-sm" title={e.label}>
                    {e.label || (e.training_id ? `Formation #${e.training_id}` : `Pack #${e.pack_id}`)}
                  </span>
                  <span className={`badge ${e.status === 'active' ? 'badge-success' : 'badge-secondary'}`}>
                    {e.status}
                  </span>
                </div>
                <div className="text-xl font-bold mb-0-5">
                  {(e.final_price ?? 0).toLocaleString()} <span className="text-xs font-normal">MAD</span>
                </div>
                <div className="text-xs text-muted mb-1">
                  Mode : <span className="font-bold uppercase">{PAYMENT_MODE_LABELS[e.payment_mode] || e.payment_mode}</span>
                  {e.discount_rate > 0 && (
                    <span className="ml-1 text-success font-bold">(-{(e.discount_rate * 100).toFixed(0)}%)</span>
                  )}
                </div>
                {e.training_id && (
                  <button
                    className="btn btn-secondary w-full py-0-5 text-xs flex items-center justify-center gap-0-5"
                    onClick={() => navigate(`/reports/formation/${e.training_id}`)}
                  >
                    <ExternalLink size={14} /> Voir détails formation
                  </button>
                )}
                {e.pack_id && (
                  <button
                    className="btn btn-secondary w-full py-0-5 text-xs flex items-center justify-center gap-0-5"
                    onClick={() => navigate(`/reports/pack/${e.pack_id}`)}
                  >
                    <ExternalLink size={14} /> Voir détails pack
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
