import React, { useState, useEffect } from 'react';
import { reportService, paymentsService } from '../services/api';
import { Briefcase, DollarSign, CheckCircle, Clock, ArrowRight, Wallet } from 'lucide-react';
import Modal from '../components/Modal';

export default function TrainerEarningsPage() {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState(null);

  useEffect(() => {
    fetchPayouts();
  }, []);

  const fetchPayouts = async () => {
    try {
      const data = await reportService.getTrainerPayouts();
      setPayouts(data);
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
          <h1 className="text-2xl font-bold">Balance des Gains Formateurs</h1>
          <p className="text-muted">Suivi des honoraires calculés vs montants versés.</p>
        </div>
      </div>

      <div className="dashboard-grid">
        {payouts.map((p, i) => (
          <div key={i} className="card flex flex-col justify-between border-l-4" style={{ borderLeftColor: p.remaining_payout > 0 ? 'var(--warning)' : 'var(--success)' }}>
            <div>
              <div className="flex justify-between items-start mb-1">
                <div className="p-1 rounded-lg bg-glass text-primary">
                  <Briefcase size={24} />
                </div>
                {p.remaining_payout > 0 ? (
                  <span className="tag tag-warning text-xs">Paiement dû</span>
                ) : (
                  <span className="tag tag-success text-xs">À jour</span>
                )}
              </div>
              <h3 className="font-bold">{p.trainer_name}</h3>
              
              <div className="mt-2 flex flex-col gap-0-5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Gains Totaux</span>
                  <span className="font-bold">{p.total_earned.toLocaleString()} MAD</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Déjà Versé</span>
                  <span className="text-success">{p.total_paid.toLocaleString()} MAD</span>
                </div>
              </div>
            </div>

            <div className="mt-2 pt-1 border-t border-surface-border">
              <div className="flex justify-between items-center bg-glass p-1 rounded-lg">
                <div>
                  <div className="text-xs text-muted uppercase font-bold">Reste à payer</div>
                  <div className={`text-lg font-bold ${p.remaining_payout > 0 ? 'text-error' : 'text-success'}`}>
                    {p.remaining_payout.toLocaleString()} MAD
                  </div>
                </div>
                <button 
                  className="btn btn-primary p-0-5 rounded-full"
                  title="Enregistrer un versement"
                  onClick={() => alert('Ouverture du formulaire de paiement formateur...')}
                >
                  <Wallet size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2 card flex items-center justify-between bg-primary text-white p-2">
        <div className="flex items-center gap-1">
          <div className="p-1 rounded-lg bg-white bg-opacity-20 text-white">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-white opacity-90">Total des Honoraires dus (Global)</p>
            <h3 className="text-2xl font-bold">{payouts.reduce((sum, p) => sum + p.remaining_payout, 0).toLocaleString()} MAD</h3>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Clock size={24} className="opacity-70" />
          <div className="text-right">
            <p className="text-white opacity-90 text-sm">Dernière mise à jour</p>
            <p className="font-bold">{new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
