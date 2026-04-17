import React, { useState, useEffect } from 'react';
import { reportService, paymentsService } from '../services/api';
import { AlertCircle, DollarSign, Calendar, User, ArrowRight, Printer } from 'lucide-react';

export default function StudentDebtPage() {
  const [debtors, setDebtors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDebts();
  }, []);

  const fetchDebts = async () => {
    try {
      const data = await reportService.getStudentDebt();
      setDebtors(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-2xl font-bold">Suivi des Dettes Étudiants</h1>
          <p className="text-muted">Consultez les balances impayées et gérez les relances.</p>
        </div>
        <button className="btn btn-secondary bg-glass">
          <Printer size={18} /> Exporter la liste
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-glass text-muted text-sm uppercase">
            <tr>
              <th className="p-1">Étudiant</th>
              <th className="p-1">Total Formation</th>
              <th className="p-1">Déjà Payé</th>
              <th className="p-1">Reste à Payer</th>
              <th className="p-1">Dernier Paiement</th>
              <th className="p-1 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {debtors.map((d, i) => (
              <tr key={i} className="border-t border-surface-border hover:bg-glass">
                <td className="p-1 font-bold flex items-center gap-0-5">
                  <User size={16} className="text-muted" /> {d.student_name}
                </td>
                <td className="p-1">{d.total_price.toLocaleString()} MAD</td>
                <td className="p-1 text-success font-medium">{d.amount_paid.toLocaleString()} MAD</td>
                <td className="p-1">
                  <span className="tag tag-warning text-error" style={{ background: '#fff0f0' }}>
                    {d.remaining_balance.toLocaleString()} MAD
                  </span>
                </td>
                <td className="p-1 text-sm text-muted">
                  {d.last_transaction ? (
                    <div className="flex items-center gap-0-5">
                      <Calendar size={14} /> {new Date(d.last_transaction).toLocaleDateString()}
                    </div>
                  ) : 'Aucun'}
                </td>
                <td className="p-1 text-center">
                  <div className="flex justify-center gap-0-5">
                    <button className="btn btn-secondary bg-glass py-0-5 px-1 text-xs">Relancer</button>
                    <button className="btn btn-primary py-0-5 px-1 text-xs">Régler</button>
                  </div>
                </td>
              </tr>
            ))}
            {debtors.length === 0 && !loading && (
              <tr>
                <td colSpan="6" className="p-3 text-center text-muted">Aunune dette en cours. Bravo !</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-2 flex gap-1">
        <div className="card flex-1 bg-glass flex items-center gap-1">
          <div className="p-1 rounded-lg bg-white text-error">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-sm text-muted">Total des Dettes</p>
            <h3 className="text-xl font-bold">{debtors.reduce((sum, d) => sum + d.remaining_balance, 0).toLocaleString()} MAD</h3>
          </div>
        </div>
        <div className="card flex-1 bg-glass flex items-center gap-1">
          <div className="p-1 rounded-lg bg-white text-primary">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-sm text-muted">Nombre de Débiteurs</p>
            <h3 className="text-xl font-bold">{debtors.length}</h3>
          </div>
        </div>
      </div>
    </div>
  );
}
