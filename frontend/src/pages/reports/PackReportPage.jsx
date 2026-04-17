import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { reportService } from '../../services/api';
import { Package, BookOpen, Users, DollarSign, ArrowLeft, TrendingUp, CheckCircle, Info } from 'lucide-react';

export default function PackReportPage() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportService.getPackReport(id).then(data => {
      setReport(data);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div className="p-3 text-center text-muted">Chargement du rapport pack...</div>;
  if (report?.error) return <div className="p-3 text-error text-center">{report.error}</div>;

  const { pack, summary, trainings, enrollments } = report;

  return (
    <div className="container p-0 fade-in">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-1">
          <button className="btn-icon bg-glass" onClick={() => window.history.back()}><ArrowLeft size={20} /></button>
          <div>
            <h1 className="text-2xl font-bold">{pack.name}</h1>
            <p className="text-muted">Analyse de performance commerciale</p>
          </div>
        </div>
      </div>

      <div className="grid grid-3 gap-1-5 mb-2">
         <div className="card bg-secondary text-white p-1-5 flex flex-col justify-between">
            <h3 className="text-sm font-bold opacity-80 uppercase mb-1">CA Généré</h3>
            <div className="text-3xl font-bold">{summary.total_revenue.toLocaleString()} MAD</div>
            <div className="text-xs mt-1 opacity-80">Remise Pack : {(pack.discount_rate * 100).toFixed(0)}%</div>
         </div>
         <div className="card p-1-5">
            <h3 className="text-sm font-bold text-muted uppercase mb-1">Ventes (Unités)</h3>
            <div className="text-2xl font-bold">{summary.enrollment_count}</div>
            <p className="text-xs text-muted mt-0-5">Acheteurs uniques du pack</p>
         </div>
         <div className="card p-1-5">
            <h3 className="text-sm font-bold text-muted uppercase mb-1">Formations Incluses</h3>
            <div className="text-2xl font-bold">{trainings.length}</div>
            <p className="text-xs text-muted mt-0-5">Contenu du programme</p>
         </div>
      </div>

      <div className="card bg-primary-light/10 border-dashed border-primary mb-2 p-1-5 flex gap-1-5 items-start">
         <div className="p-1 rounded-full bg-white text-primary"><Info size={24} /></div>
         <div>
            <h3 className="font-bold text-primary mb-0-5">Description du Pack</h3>
            <p className="text-sm text-primary opacity-80 leading-relaxed">{pack.description || "Aucune description fournie pour ce pack."}</p>
         </div>
      </div>

      <div className="grid grid-2 gap-2">
        <div>
          <h2 className="mb-1 flex items-center gap-0-5"><BookOpen size={20} /> Formations du Pack</h2>
          <div className="flex flex-col gap-1">
             {trainings.map(t => (
                <div key={t.id} className="card p-1-5 flex justify-between items-center hover:border-primary transition-all">
                   <div>
                      <div className="font-bold">{t.title}</div>
                      <div className="text-xs text-muted">{t.total_hours} heures de formation</div>
                   </div>
                   <div className="text-lg font-bold text-primary">{t.price.toLocaleString()} MAD</div>
                </div>
             ))}
          </div>
        </div>

        <div>
           <h2 className="mb-1 flex items-center gap-0-5"><Users size={20} /> Inscriptions Récentes</h2>
           <div className="card p-0 overflow-hidden">
              <table className="table w-full">
                 <thead className="bg-glass">
                    <tr>
                       <th className="p-1-5 text-left text-xs uppercase">Étudiant</th>
                       <th className="p-1-5 text-right text-xs uppercase">Prix Appliqué</th>
                    </tr>
                 </thead>
                 <tbody>
                    {enrollments.map((e, i) => (
                       <tr key={i} className="border-t border-surface-border">
                          <td className="p-1-5 font-bold">Étudiant #{e.student_id}</td>
                          <td className="p-1-5 text-right font-bold text-success">{e.final_price?.toLocaleString()} MAD</td>
                       </tr>
                    ))}
                    {enrollments.length === 0 && <tr><td colSpan="2" className="p-3 text-center text-muted">Aucun étudiant n'a encore souscrit à ce pack.</td></tr>}
                 </tbody>
              </table>
           </div>
        </div>
      </div>
    </div>
  );
}
