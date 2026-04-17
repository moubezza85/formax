import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { reportService } from '../../services/api';
import { BookOpen, Users, DollarSign, TrendingUp, ArrowLeft, Calendar, Download, CreditCard, GraduationCap } from 'lucide-react';

export default function TrainingReportPage() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportService.getFormationReport(id).then(data => {
      setReport(data);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div className="p-3 text-center text-muted">Chargement du rapport...</div>;
  if (report?.error) return <div className="p-3 text-error text-center">{report.error}</div>;

  const { training, summary, trainers, enrollments } = report;

  return (
    <div className="container p-0 fade-in">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-1">
          <button className="btn-icon bg-glass" onClick={() => window.history.back()}><ArrowLeft size={20} /></button>
          <div>
            <h1 className="text-2xl font-bold">{training.title}</h1>
            <p className="text-muted">Analyse financière et opérationnelle</p>
          </div>
        </div>
        <button className="btn bg-glass border flex gap-0-5 items-center">
          <Download size={18} /> Export Excel
        </button>
      </div>

      <div className="dashboard-grid mb-2">
        <div className="card border-l-4 border-primary">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-muted uppercase">Inscriptions</p>
              <h3 className="text-2xl font-bold">{summary.total_enrollments}</h3>
            </div>
            <div className="p-0-5 rounded bg-primary-light text-primary"><Users size={20} /></div>
          </div>
          <p className="text-xs text-muted mt-0-5">Étudiants actifs</p>
        </div>

        <div className="card border-l-4 border-success">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-muted uppercase">Chiffre d'Affaires</p>
              <h3 className="text-2xl font-bold">{summary.total_revenue.toLocaleString()} MAD</h3>
            </div>
            <div className="p-0-5 rounded bg-success-light text-success"><TrendingUp size={20} /></div>
          </div>
          <p className="text-xs text-muted mt-0-5">Total facturé aux étudiants</p>
        </div>

        <div className="card border-l-4 border-warning">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-muted uppercase">Coûts Formateurs</p>
              <h3 className="text-2xl font-bold">{summary.trainer_costs.toLocaleString()} MAD</h3>
            </div>
            <div className="p-0-5 rounded bg-warning-light text-warning"><DollarSign size={20} /></div>
          </div>
          <p className="text-xs text-muted mt-0-5">Honoraires totaux calculés</p>
        </div>

        <div className="card border-l-4 border-secondary">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-muted uppercase">Marge Nette</p>
              <h3 className="text-2xl font-bold">{summary.net_margin.toLocaleString()} MAD</h3>
            </div>
            <div className="p-0-5 rounded bg-secondary-light text-secondary"><CreditCard size={20} /></div>
          </div>
          <p className="text-xs text-success font-bold mt-0-5">{(summary.net_margin / summary.total_revenue * 100).toFixed(1)}% de rentabilité</p>
        </div>
      </div>

      <div className="grid grid-2 gap-2">
        <div>
          <h2 className="mb-1 flex items-center gap-0-5"><GraduationCap size={20} /> Équipe Pédagogique (Honoraires)</h2>
          <div className="card p-0 overflow-hidden">
            <table className="table w-full">
              <thead>
                <tr className="bg-glass">
                  <th className="p-1-5 text-left text-xs uppercase">Nom Formateur</th>
                  <th className="p-1-5 text-left text-xs uppercase">Mode</th>
                  <th className="p-1-5 text-right text-xs uppercase">Montant estimé</th>
                </tr>
              </thead>
              <tbody>
                {trainers.map((t, i) => (
                  <tr key={i} className="border-t border-surface-border">
                    <td className="p-1-5 font-bold">{t.name}</td>
                    <td className="p-1-5 text-sm"><span className="tag">{t.mode}</span></td>
                    <td className="p-1-5 text-right font-bold text-primary">{t.expected.toLocaleString()} MAD</td>
                  </tr>
                ))}
                {trainers.length === 0 && <tr><td colSpan="3" className="p-2 text-center text-muted">Aucun formateur assigné.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div>
           <h2 className="mb-1 flex items-center gap-0-5"><Users size={20} /> État des Inscriptions</h2>
           <div className="card p-0 overflow-hidden">
            <table className="table w-full">
              <thead>
                <tr className="bg-glass">
                  <th className="p-1-5 text-left text-xs uppercase">ID Étudiant</th>
                  <th className="p-1-5 text-left text-xs uppercase">Réduction</th>
                  <th className="p-1-5 text-right text-xs uppercase">Prix Final</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map((e, i) => (
                  <tr key={i} className="border-t border-surface-border">
                    <td className="p-1-5 font-bold">Étudiant #{e.student_id}</td>
                    <td className="p-1-5"><span className="tag bg-glass">{(e.discount_rate * 100).toFixed(0)}%</span></td>
                    <td className="p-1-5 text-right font-bold">{e.final_price.toLocaleString()} MAD</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <div className="mt-2 text-center">
         <p className="text-sm text-muted">Montant déjà encaissé : <span className="font-bold text-success">{summary.total_paid.toLocaleString()} MAD</span> • Reste à percevoir : <span className="font-bold text-error">{summary.remaining.toLocaleString()} MAD</span></p>
      </div>
    </div>
  );
}
