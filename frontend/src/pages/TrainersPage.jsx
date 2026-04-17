import React, { useState, useEffect } from 'react';
import { userService } from '../services/api';
import { Search, Plus, Edit3, Trash, Briefcase, BarChart } from 'lucide-react';
import Modal from '../components/Modal';
import UserForm from '../components/forms/UserForm';

export default function TrainersPage() {
  const [trainers, setTrainers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState(null);

  useEffect(() => {
    fetchTrainers();
  }, []);

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

  const handleCreate = () => {
    setSelectedTrainer(null);
    setIsModalOpen(true);
  };

  const handleEdit = (trainer) => {
    setSelectedTrainer(trainer);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Voulez-vous vraiment supprimer ce formateur ? Cela impactera ses sessions en cours.')) {
      await userService.deleteUser(id);
      fetchTrainers();
    }
  };

  const filteredTrainers = trainers.filter(t => 
    `${t.first_name} ${t.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            placeholder="Rechercher un formateur..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="dashboard-grid">
        {filteredTrainers.map(trainer => (
          <div key={trainer.id} className="card flex flex-col gap-1">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-1">
                <div className="p-1 rounded-lg bg-glass text-primary">
                  <Briefcase size={24} />
                </div>
                <div>
                  <h3 className="font-bold">{trainer.first_name} {trainer.last_name}</h3>
                  <p className="text-sm text-muted">{trainer.email}</p>
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
                <button onClick={() => handleDelete(trainer.id)} className="btn-icon text-error bg-glass"><Trash size={16} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

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
