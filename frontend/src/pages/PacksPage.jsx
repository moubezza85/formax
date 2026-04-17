import React, { useState, useEffect } from 'react';
import { packService, trainingService } from '../services/api';
import { Plus, Package, Edit2, Trash2, BookOpen, Clock, Tag, BarChart } from 'lucide-react';
import Modal from '../components/Modal';

export default function PacksPage() {
  const [packs, setPacks] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPack, setSelectedPack] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    discount_rate: 0,
    training_ids: []
  });

  useEffect(() => {
    fetchPacks();
    fetchTrainings();
  }, []);

  const fetchPacks = async () => {
    try {
      const data = await packService.getPacks();
      setPacks(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTrainings = async () => {
    try {
      const data = await trainingService.getTrainings();
      setTrainings(data.filter(t => !t.is_deleted));
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenModal = (pack = null) => {
    if (pack) {
      setSelectedPack(pack);
      setFormData({
        name: pack.name,
        discount_rate: pack.discount_rate * 100,
        training_ids: pack.trainings.map(t => t.id)
      });
    } else {
      setSelectedPack(null);
      setFormData({ name: '', discount_rate: 0, training_ids: [] });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      discount_rate: formData.discount_rate / 100
    };
    
    try {
      if (selectedPack) {
        await packService.updatePack(selectedPack.id, data);
      } else {
        await packService.createPack(data);
      }
      setIsModalOpen(false);
      fetchPacks();
    } catch (err) {
      alert('Erreur lors de l\'enregistrement');
    }
  };

  const toggleTraining = (id) => {
    setFormData(prev => ({
      ...prev,
      training_ids: prev.training_ids.includes(id)
        ? prev.training_ids.filter(tid => tid !== id)
        : [...prev.training_ids, id]
    }));
  };

  const handleDelete = async (id) => {
    if (window.confirm('Supprimer ce pack ?')) {
      await packService.deletePack(id);
      fetchPacks();
    }
  };

  const calculateTotalHours = (p) => {
    return p.trainings.reduce((sum, t) => sum + (t.total_hours || 0), 0);
  };

  return (
    <div className="fade-in">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-2xl font-bold">Gestion des Packs</h1>
          <p className="text-muted">Créez des bundles de formations avec des réductions.</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={18} /> Nouveau Pack
        </button>
      </div>

      <div className="dashboard-grid">
        {packs.map(p => (
          <div key={p.id} className="card flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-1">
                <div className="p-1 rounded-lg bg-primary-light text-primary">
                  <Package size={24} />
                </div>
                <div className="flex gap-0-5">
                  <button onClick={() => handleOpenModal(p)} className="btn-icon text-muted"><Edit2 size={16} /></button>
                  <button onClick={() => handleDelete(p.id)} className="btn-icon text-error"><Trash2 size={16} /></button>
                </div>
              </div>
              <h3 className="font-bold mb-0-5">{p.name}</h3>
              <div className="text-sm text-muted mb-1">
                {p.trainings.length} Formations incluses
              </div>
              <div className="flex flex-col gap-0-5">
                {p.trainings.map(t => (
                  <div key={t.id} className="text-xs bg-glass p-0-5 rounded flex items-center gap-0-5">
                    <BookOpen size={12} /> {t.title}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="mt-2 pt-1 border-t border-surface-border flex justify-between items-center">
              <div>
                <div className="flex items-center gap-0-5 text-sm font-bold text-primary">
                  <Tag size={14} /> -{p.discount_rate * 100}%
                </div>
                <div className="flex items-center gap-0-5 text-xs text-muted">
                  <Clock size={12} /> {calculateTotalHours(p)} Heures au total
                </div>
              </div>
              <div className="flex gap-0-5 items-center">
                <button 
                  onClick={() => window.location.href = `/reports/pack/${p.id}`} 
                  className="btn btn-secondary py-0-5 px-1 text-xs bg-glass"
                >
                  <BarChart size={14} className="mr-0-5" /> Rapport
                </button>
                <span className="tag tag-success">Actif</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={selectedPack ? "Modifier le Pack" : "Créer un Nouveau Pack"}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-1">
          <div>
            <label className="text-sm font-bold block mb-0-5">Nom du Pack</label>
            <input 
              type="text" 
              className="input" 
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              required 
            />
          </div>
          <div>
            <label className="text-sm font-bold block mb-0-5">Réduction du Pack (%)</label>
            <input 
              type="number" 
              className="input" 
              value={formData.discount_rate}
              onChange={e => setFormData({...formData, discount_rate: parseInt(e.target.value)})}
              required 
            />
          </div>
          
          <div className="border-t pt-1">
            <h3 className="text-sm font-bold mb-1">Sélectionner les Formations</h3>
            <div className="max-h-30 overflow-y-auto pr-0-5">
              {trainings.map(t => (
                <div 
                  key={t.id} 
                  className={`flex justify-between items-center p-0-5 rounded mb-0-5 cursor-pointer ${formData.training_ids.includes(t.id) ? 'bg-primary-light' : 'bg-glass'}`}
                  onClick={() => toggleTraining(t.id)}
                >
                  <span className="text-sm">{t.title}</span>
                  <input type="checkbox" checked={formData.training_ids.includes(t.id)} readOnly />
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-1 mt-1">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn bg-glass flex-1">Annuler</button>
            <button type="submit" className="btn btn-primary flex-1">Enregistrer le Pack</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
