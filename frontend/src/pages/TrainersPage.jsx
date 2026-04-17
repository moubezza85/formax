import React, { useState, useEffect } from 'react';
import { userService } from '../services/api';
import { Search, Plus, Edit3, Trash, Briefcase, BarChart } from 'lucide-react';
import Modal from '../components/Modal';
import UserForm from '../components/forms/UserForm';

const PAYMENT_MODE_LABELS = {
  hourly: 'Par heure',
  per_student: 'Par étudiant',
  fixed: 'Forfait',
  monthly: 'Mensualité',
};

export default function TrainersPage() {
  const [trainers, setTrainers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState(null);

  useEffect(() => { fetchTrainers(); }, []);

  const fetchTrainers = async () => {
    try {
      const data = await userService.getTrainers();
      setTrainers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => { setSelectedTrainer(null); setIsModalOpen(true); };
  const handleEdit = (t) => { setSelectedTrainer(t); setIsModalOpen(true); };

  const handleDelete = async (userId) => {
    if (window.confirm('Voulez-vous vraiment supprimer ce formateur ?')) {
      await userService.deleteUser(userId);
      fetchTrainers();
    }
  };

  // helper: accès unifié que la réponse soit imbriquée (TrainerOut) ou plate
  const u = (t) => t.user || t;

  const filteredTrainers = trainers.filter(t => {
    const usr = u(t);
    const fullName = `${usr.first_name ?? ''} ${usr.last_name ?? ''}`.toLowerCase();
    const specialty = (t.specialty ?? '').toLowerCase();
    return fullName.includes(searchTerm.toLowerCase())
      || specialty.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="fade-in">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-2xl font-bold">Gestion des Formateurs</h1>
          <p className="text-muted">Équipe pédagogique et intervenants.</p>
        </div>
        <button className="btn btn-primary" onClick={handleCreate}>
          <Plus size={18} /> Ajouter un Formateur
        </button>
      </div>

      <div className="card mb-2">
        <div className="relative">
          <Search className="absolute left-1 top-1 text-muted" size={18} />
          <input
            type="text"
            className="input pl-3 mb-0"
            placeholder="Rechercher par nom ou spécialité..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="card p-2 text-center text-muted">Chargement...</div>
      ) : filteredTrainers.length === 0 ? (
        <div className="card p-2 text-center text-muted">Aucun formateur trouvé.</div>
      ) : (
        <div className="dashboard-grid">
          {filteredTrainers.map(trainer => {
            const usr = u(trainer);
            return (
              <div key={trainer.id} className="card flex flex-col gap-1">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-1">
                    <div className="p-1 rounded-lg bg-glass text-primary">
                      <Briefcase size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold">{usr.first_name} {usr.last_name}</h3>
                      <p className="text-sm text-muted">{usr.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-0-5">
                    <button
                      onClick={() => window.location.href = `/reports/trainer/${trainer.id}`}
                      className="btn btn-secondary flex-1 py-0-5 text-xs bg-glass"
                    >
                      <BarChart size={14} className="mr-0-5" /> Rapport
                    </button>
                    <button onClick={() => handleEdit(trainer)} className="btn-icon text-muted bg-glass"><Edit3 size={16} /></button>
                    <button onClick={() => handleDelete(usr.id || trainer.id)} className="btn-icon text-error bg-glass"><Trash size={16} /></button>
                  </div>
                </div>

                {/* Infos supplémentaires */}
                <div className="flex flex-wrap gap-0-5 text-xs">
                  {trainer.specialty && (
                    <span className="badge badge-secondary">{trainer.specialty}</span>
                  )}
                  {trainer.level && (
                    <span className="badge bg-glass text-muted">Niv. {trainer.level}</span>
                  )}
                  {trainer.default_payment_mode && (
                    <span className="badge badge-primary">
                      {PAYMENT_MODE_LABELS[trainer.default_payment_mode] || trainer.default_payment_mode}
                    </span>
                  )}
                </div>

                {/* Honoraires */}
                <div className="grid grid-cols-2 gap-0-5 text-xs mt-0-5">
                  {trainer.hourly_rate > 0 && (
                    <div className="bg-glass rounded p-0-5">
                      <span className="text-muted">Taux horaire</span>
                      <div className="font-bold">{trainer.hourly_rate} MAD/h</div>
                    </div>
                  )}
                  {trainer.price_per_student > 0 && (
                    <div className="bg-glass rounded p-0-5">
                      <span className="text-muted">Par étudiant</span>
                      <div className="font-bold">{trainer.price_per_student} MAD</div>
                    </div>
                  )}
                  {trainer.fixed_price_per_training > 0 && (
                    <div className="bg-glass rounded p-0-5">
                      <span className="text-muted">Forfait</span>
                      <div className="font-bold">{trainer.fixed_price_per_training} MAD</div>
                    </div>
                  )}
                  {trainer.monthly_salary > 0 && (
                    <div className="bg-glass rounded p-0-5">
                      <span className="text-muted">Mensuel</span>
                      <div className="font-bold">{trainer.monthly_salary} MAD/mois</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedTrainer ? "Modifier le Formateur" : "Créer un Formateur"}
      >
        <UserForm
          user={selectedTrainer}
          role="TRAINER"
          onSuccess={() => { setIsModalOpen(false); fetchTrainers(); }}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
