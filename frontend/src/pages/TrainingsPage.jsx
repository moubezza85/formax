import React, { useState, useEffect } from 'react';
import { trainingService } from '../services/api';
import { Plus, BookOpen, Layers, Edit2, Trash2, Clock } from 'lucide-react';
import Modal from '../components/Modal';
import TrainingForm from '../components/forms/TrainingForm';

export default function TrainingsPage() {
  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTraining, setSelectedTraining] = useState(null);

  useEffect(() => {
    fetchTrainings();
  }, []);

  const fetchTrainings = async () => {
    try {
      const data = await trainingService.getTrainings();
      setTrainings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedTraining(null);
    setIsModalOpen(true);
  };

  const handleEdit = (training) => {
    setSelectedTraining(training);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Voulez-vous vraiment supprimer cette formation ?')) {
      await trainingService.deleteTraining(id);
      fetchTrainings();
    }
  };

  return (
    <div className="fade-in">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-2xl font-bold">Catalogue des Formations</h1>
          <p className="text-muted">Gérez vos programmes pédagogiques et vos packs.</p>
        </div>
        <div className="flex gap-1">
          <button className="btn btn-secondary bg-glass">
            <Layers size={18} /> Créer un Pack
          </button>
          <button className="btn btn-primary" onClick={handleCreate}>
            <Plus size={18} /> Nouvelle Formation
          </button>
        </div>
      </div>

      <div className="dashboard-grid">
        {trainings.map(training => (
          <div key={training.id} className="card flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-1">
                <div className="p-1 rounded-lg bg-glass text-primary">
                  <BookOpen size={24} />
                </div>
                <div className="flex gap-0-5">
                  <button onClick={() => handleEdit(training)} className="btn-icon text-muted"><Edit2 size={16} /></button>
                  <button onClick={() => handleDelete(training.id)} className="btn-icon text-error"><Trash2 size={16} /></button>
                </div>
              </div>
              <h3 className="font-bold mb-0-5">{training.title}</h3>
              <p className="text-sm text-muted mb-1 text-clamp">{training.description || 'Aucune description disponible'}.</p>
              <div className="flex items-center gap-0-5 text-sm text-muted">
                <Clock size={14} />
                <span>{training.total_hours} Heures</span>
              </div>
            </div>
            <div className="mt-2 pt-1 border-t border-surface-border flex justify-between items-center">
              <span className="text-lg font-bold text-primary">{training.price} MAD</span>
              <span className="tag tag-success">Active</span>
            </div>
          </div>
        ))}
        {!loading && trainings.length === 0 && (
          <div className="col-span-full card text-center p-3 text-muted">Aucune formation dans le catalogue.</div>
        )}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={selectedTraining ? "Modifier la Formation" : "Nouvelle Formation"}
      >
        <TrainingForm 
          training={selectedTraining}
          onSuccess={() => { setIsModalOpen(false); fetchTrainings(); }}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
