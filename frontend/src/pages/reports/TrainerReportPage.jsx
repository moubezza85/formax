import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { reportService, paymentsService } from '../../services/api';
import {
  Briefcase, DollarSign, ArrowLeft, Clock,
  CheckCircle, Users, ExternalLink, Plus, X, Send
} from 'lucide-react';

const MODE_LABELS = {
  hourly: 'Par heure',
  per_student: 'Par étudiant',
  fixed: 'Forfait',
  monthly: 'Mensualité',
};

const PAYMENT_TYPE_OPTS = [
  { value: 'partial', label: 'Acompte / Partiel' },
  { value: 'full', label: 'Solde total' },
  { value: 'advance', label: 'Avance' },
];

export default function TrainerReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modale paiement
  const [showModal, setShowModal] = useState(false);
  const [payForm, setPayForm] = useState({ training_id: '', amount: '', payment_type: 'partial', notes: '' });
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');

  const fetchReport = () => {
    reportService.getTrainerReport(id)
      .then(data => { setReport(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchReport(); }, [id]);

  const handlePay = async () => {
    setPayError('');
    if (!payForm.amount || isNaN(payForm.amount) || Number(payForm.amount) <= 0) {
      setPayError('Veuillez saisir un montant valide.');
      return;
    }
    setPaying(true);
    try {
      await paymentsService.registerTrainerPayment({
        trainer_id: Number(id),
        training_id: payForm.training_id ? Number(payForm.training_id) : null,
        amount: Number(payForm.amount),
        payment_type: payForm.payment_type,
        notes: payForm.notes || null,
      });
      setShowModal(false);
      setPayForm({ training_id: '', amount: '', payment_type: 'partial', notes: '' });
      setLoading(true);
      fetchReport();
    } catch (e) {
      setPayError(e?.response?.data?.detail || 'Erreur lors du paiement.');
    } finally {
      setPaying(false);
    }
  };

  if (loading) return <div className="p-3 text-center text-muted">Chargement du rapport formateur...</div>;
  if (report?.error) return <div className="p-3 text-error text-center">{report.error}</div>;

  const { trainer, summary, activities, payments } = report;
  const firstName = trainer?.first_name || '';
  const lastName = trainer?.last_name || '';
  const fullName = (firstName || lastName) ? `${firstName} ${lastName}`.trim() : `Formateur #${id}`;

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
              <Briefcase size={20} className="text-primary" />
              <h1 className="text-2xl font-bold">{fullName}</h1>
            </div>
            <div className="flex gap-0-5 mt-0-5">
              {trainer?.specialty && <span className="badge badge-secondary">{trainer.specialty}</span>}
              {trainer?.level && <span className="badge badge-primary">Niv. {trainer.level}</span>}
              <span className="text-muted text-xs" style={{lineHeight:'1.8'}}>Rapport d'activité &amp; Honoraires</span>
            </div>
          </div>
        </div>
        <button
          className="btn btn-primary flex items-center gap-0-5"
          onClick={() => { setShowModal(true); setPayError(''); }}
        >
          <Plus size={16} /> Enregistrer un paiement
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-3 gap-1-5 mb-2">
        <div className="card kpi-card kpi-warning flex flex-col justify-between">
          <h3 className="text-sm font-bold uppercase mb-1" style={{opacity:0.85}}>Reste à percevoir</h3>
          <div className="text-3xl font-bold">{(summary?.balance ?? 0).toLocaleString()} MAD</div>
          <div className="text-xs mt-1" style={{opacity:0.85}}>Total cumulé : {(summary?.total_earned ?? 0).toLocaleString()} MAD</div>
        </div>
        <div className="card kpi-card kpi-success flex flex-col justify-between">
          <h3 className="text-sm font-bold uppercase mb-1" style={{opacity:0.85}}>Honoraires Réglés</h3>
          <div className="text-3xl font-bold">{(summary?.total_paid ?? 0).toLocaleString()} MAD</div>
          <div className="text-xs mt-1" style={{opacity:0.85}}>{(payments ?? []).length} versement(s)</div>
        </div>
        <div className="card kpi-card kpi-indigo flex flex-col justify-between">
          <h3 className="text-sm font-bold uppercase mb-1" style={{opacity:0.85}}>Missions</h3>
          <div className="text-3xl font-bold">{(activities ?? []).length}</div>
          <div className="text-xs mt-1" style={{opacity:0.85}}>Formations assignées</div>
        </div>
      </div>

      {/* Missions + Historique versements */}
      <div className="grid grid-3 gap-2">
        <div className="col-span-2">
          <h2 className="mb-1 flex items-center gap-0-5"><Briefcase size={20} /> Détail par Mission</h2>
          <div className="flex flex-col gap-1">
            {(activities ?? []).length === 0 && (
              <p className="card p-3 text-center text-muted">Aucune activité enregistrée.</p>
            )}
            {(activities ?? []).map((a, i) => (
              <div key={i} className="card p-1-5" style={{borderLeft:'4px solid var(--primary)'}}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-bold mb-0-5">{a.training_title}</h3>
                    <div className="flex flex-wrap gap-0-5">
                      <span className="badge badge-primary">{MODE_LABELS[a.calculation?.mode] || a.calculation?.mode}</span>
                      {a.calculation?.total_hours !== undefined && (
                        <span className="badge badge-secondary flex items-center gap-0-25">
                          <Clock size={12} /> {a.calculation.total_hours}h
                        </span>
                      )}
                      {a.calculation?.student_count !== undefined && (
                        <span className="badge badge-secondary flex items-center gap-0-25">
                          <Users size={12} /> {a.calculation.student_count} inscrits
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-0-5">
                    <div className="text-right">
                      <div className="text-xl font-bold text-primary">{(a.earned ?? 0).toLocaleString()} MAD</div>
                      {a.calculation?.rate !== undefined && (
                        <div className="text-xs text-muted">Tarif : {a.calculation.rate} MAD</div>
                      )}
                    </div>
                    <button
                      className="btn-icon"
                      title="Voir rapport formation"
                      onClick={() => navigate(`/reports/training/${a.training_id}`)}
                    >
                      <ExternalLink size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-1 flex items-center gap-0-5"><DollarSign size={20} /> Historique Versements</h2>
          <div className="card p-0 overflow-hidden">
            {(payments ?? []).length === 0 && (
              <p className="p-2 text-center text-muted text-sm">Aucun versement.</p>
            )}
            {(payments ?? []).map(p => (
              <div key={p.id} className="p-1 border-t border-surface-border flex justify-between items-center">
                <div>
                  <div className="font-bold text-sm">{(p.amount ?? 0).toLocaleString()} MAD</div>
                  <div className="text-xs text-muted">{p.date ? new Date(p.date).toLocaleDateString('fr-FR') : '—'}</div>
                  {p.payment_type && <span className="badge badge-secondary" style={{fontSize:'0.7rem'}}>{p.payment_type}</span>}
                </div>
                <CheckCircle size={16} className="text-success" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Modale Paiement ─── */}
      {showModal && (
        <div
          style={{
            position:'fixed', inset:0, background:'rgba(0,0,0,0.5)',
            zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem'
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="card" style={{width:'100%', maxWidth:'480px', padding:'1.5rem', position:'relative'}}>
            {/* Header modale */}
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-bold flex items-center gap-0-5">
                <DollarSign size={20} className="text-primary" />
                Enregistrer un honoraire
              </h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>

            <p className="text-sm text-muted mb-2">
              Formateur : <span className="font-bold text-primary">{fullName}</span>
            </p>

            {/* Formation concernée */}
            <div className="mb-1-5">
              <label className="text-sm font-bold mb-0-5 block">Formation concernée <span className="text-muted font-normal">(optionnel)</span></label>
              <select
                className="input w-full"
                value={payForm.training_id}
                onChange={e => setPayForm(f => ({ ...f, training_id: e.target.value }))}
              >
                <option value="">— Toutes formations —</option>
                {(activities ?? []).map(a => (
                  <option key={a.training_id} value={a.training_id}>{a.training_title}</option>
                ))}
              </select>
            </div>

            {/* Montant */}
            <div className="mb-1-5">
              <label className="text-sm font-bold mb-0-5 block">Montant <span className="text-error">*</span></label>
              <div className="flex gap-0-5 items-center">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="input w-full"
                  placeholder="Ex : 1500"
                  value={payForm.amount}
                  onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))}
                />
                <span className="text-sm font-bold text-muted" style={{whiteSpace:'nowrap'}}>MAD</span>
              </div>
              {/* Suggestion solde */}
              {(summary?.balance ?? 0) > 0 && (
                <button
                  className="text-xs text-primary mt-0-5"
                  style={{background:'none', border:'none', cursor:'pointer', padding:0}}
                  onClick={() => setPayForm(f => ({ ...f, amount: String(summary.balance) }))}
                >
                  Utiliser le solde restant : {summary.balance.toLocaleString()} MAD
                </button>
              )}
            </div>

            {/* Type paiement */}
            <div className="mb-1-5">
              <label className="text-sm font-bold mb-0-5 block">Type de versement</label>
              <div className="flex gap-1">
                {PAYMENT_TYPE_OPTS.map(opt => (
                  <button
                    key={opt.value}
                    className={`btn text-xs flex-1 ${
                      payForm.payment_type === opt.value ? 'btn-primary' : 'btn-secondary'
                    }`}
                    onClick={() => setPayForm(f => ({ ...f, payment_type: opt.value }))}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Note */}
            <div className="mb-2">
              <label className="text-sm font-bold mb-0-5 block">Note <span className="text-muted font-normal">(optionnel)</span></label>
              <input
                type="text"
                className="input w-full"
                placeholder="Ex : Virement du 17/04..."
                value={payForm.notes}
                onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>

            {payError && <p className="text-error text-sm mb-1">{payError}</p>}

            <div className="flex gap-1">
              <button className="btn btn-secondary flex-1" onClick={() => setShowModal(false)}>Annuler</button>
              <button
                className="btn btn-primary flex-1 flex items-center justify-center gap-0-5"
                onClick={handlePay}
                disabled={paying}
              >
                {paying ? 'Enregistrement...' : <><Send size={16} /> Confirmer le paiement</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
