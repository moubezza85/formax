import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { reportService } from '../../services/api';
import { User, BookOpen, CreditCard, ArrowLeft, History, Mail, Phone, ExternalLink, ShieldCheck } from 'lucide-react';

export default function StudentReportPage() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportService.getStudentReport(id).then(data => {
      setReport(data);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div className="p-3 text-center text-muted">Chargement de la fiche étudiant...</div>;
  if (report?.error) return <div className="p-3 text-error text-center">{report.error}</div>;

  const { student, summary, enrollments, payments } = report;
  const user = student.user || {};

  return (
    <div className="container p-0 fade-in">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-1">
          <button className="btn-icon bg-glass" onClick={() => window.history.back()}><ArrowLeft size={20} /></button>
          <div>
            <h1 className="text-2xl font-bold">{user.first_name} {user.last_name}</h1>
            <p className="text-muted">Fiche Étudiant & Historique Financier</p>
          </div>
        </div>
        <div className="bg-success-light text-success px-1 py-0-5 rounded-full text-sm font-bold flex items-center gap-0-5">
           <ShieldCheck size={16} /> Profil Vérifié
        </div>
      </div>

      <div className="grid grid-3 gap-1-5 mb-2">
         <div className="card bg-primary text-white p-1-5 flex flex-col justify-between">
            <h3 className="text-sm font-bold opacity-80 uppercase mb-1">Reste à payer</h3>
            <div className="text-3xl font-bold">{summary.balance.toLocaleString()} MAD</div>
            <div className="text-xs mt-1 opacity-80">Total Facturé : {summary.total_invoiced.toLocaleString()} MAD</div>
         </div>
         <div className="card p-1-5">
            <h3 className="text-sm font-bold text-muted uppercase mb-1">Coordonnées</h3>
            <div className="flex flex-col gap-0-5">
               <div className="flex items-center gap-0-5 text-sm font-medium"><Mail size={16} className="text-primary"/> {user.email}</div>
               <div className="flex items-center gap-0-5 text-sm font-medium"><Phone size={16} className="text-primary"/> {user.phone || 'Non renseigné'}</div>
            </div>
         </div>
         <div className="card p-1-5">
            <h3 className="text-sm font-bold text-muted uppercase mb-1">Inscriptions</h3>
            <div className="text-2xl font-bold">{enrollments.length}</div>
            <p className="text-xs text-primary font-bold mt-0-5">Date d'ajout : {new Date(student.added_at).toLocaleDateString()}</p>
         </div>
      </div>

      <div className="grid grid-3 gap-2">
        <div className="col-span-2">
          <h2 className="mb-1 flex items-center gap-0-5"><History size={20} /> Historique des Paiements</h2>
          <div className="card p-0 overflow-hidden">
             <table className="table w-full">
                <thead className="bg-glass">
                   <tr>
                      <th className="p-1 text-left text-xs uppercase">Date</th>
                      <th className="p-1 text-left text-xs uppercase">Type</th>
                      <th className="p-1 text-left text-xs uppercase">Réf / Note</th>
                      <th className="p-1 text-right text-xs uppercase">Montant</th>
                   </tr>
                </thead>
                <tbody>
                   {payments.map(p => (
                      <tr key={p.id} className="border-t border-surface-border">
                         <td className="p-1 text-sm">{new Date(p.date).toLocaleDateString()}</td>
                         <td className="p-1"><span className="tag">{p.payment_type}</span></td>
                         <td className="p-1 text-sm text-muted">{p.paid_by ? `[${p.paid_by}] ` : ''}{p.notes || '-'}</td>
                         <td className="p-1 text-right font-bold text-success">+{p.amount.toLocaleString()} MAD</td>
                      </tr>
                   ))}
                   {payments.length === 0 && <tr><td colSpan="4" className="p-2 text-center text-muted">Aucun paiement enregistré pour le moment.</td></tr>}
                </tbody>
             </table>
          </div>
        </div>

        <div>
          <h2 className="mb-1 flex items-center gap-0-5"><BookOpen size={20} /> Formations Souscrites</h2>
          <div className="flex flex-col gap-1">
             {enrollments.map(e => (
                <div key={e.id} className="card p-1-5 hover:border-primary transition-all border-l-4 border-primary">
                   <div className="flex justify-between items-start mb-0-5">
                      <span className="font-bold text-sm">Formation #{e.training_id || e.pack_id}</span>
                      <span className={`tag ${e.status === 'active' ? 'tag-success' : 'bg-glass'}`}>{e.status}</span>
                   </div>
                   <div className="text-xl font-bold mb-0-5">{e.final_price?.toLocaleString()} <span className="text-xs font-normal">MAD</span></div>
                   <div className="text-xs text-muted mb-1">
                       Mode : <span className="font-bold uppercase">{e.payment_mode}</span>
                       {e.discount_rate > 0 && <span className="ml-1 text-success font-bold">(-{(e.discount_rate * 100).toFixed(0)}%)</span>}
                   </div>
                   <button className="btn btn-secondary w-full py-0-5 text-xs flex items-center justify-center gap-0-5">
                      <ExternalLink size={14} /> Voir détails formation
                   </button>
                </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
}
