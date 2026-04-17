import React, { useState, useEffect } from 'react';
import { trainingService } from '../../services/api';

export default function TrainingForm({ training, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: 0,
    total_hours: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (training) {
      setFormData({
        title: training.title,
        description: training.description || '',
        price: training.price,
        total_hours: training.total_hours || 0
      });
    }
  }, [training]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (training) {
        await trainingService.updateTraining(training.id, formData);
      } else {
        await trainingService.createTraining(formData);
      }
      onSuccess();
    } catch (err) {
      setError('Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert alert-error mb-1">{error}</div>}
      
      <div>
        <label className="text-sm font-bold block">Titre de la Formation</label>
        <input 
          type="text" 
          className="input" 
          value={formData.title}
          onChange={e => setFormData({...formData, title: e.target.value})}
          required 
        />
      </div>

      <div>
        <label className="text-sm font-bold block">Description</label>
        <textarea 
          className="input" 
          style={{ height: '80px', resize: 'none' }}
          value={formData.description}
          onChange={e => setFormData({...formData, description: e.target.value})}
        />
      </div>

      <div className="flex gap-1 items-start">
        <div className="flex-1">
          <label className="text-sm font-bold block">Prix (MAD)</label>
          <input 
            type="number" 
            className="input" 
            value={formData.price}
            onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})}
            required 
          />
        </div>
        <div className="flex-1">
          <label className="text-sm font-bold block">Volume Horaire</label>
          <input 
            type="number" 
            className="input" 
            value={formData.total_hours}
            onChange={e => setFormData({...formData, total_hours: parseFloat(e.target.value)})}
            required 
          />
        </div>
      </div>

      <div className="flex justify-between gap-1 mt-1">
        <button type="button" onClick={onCancel} className="btn bg-glass flex-1">Annuler</button>
        <button type="submit" disabled={loading} className="btn btn-primary flex-1">
          {loading ? 'Chargement...' : (training ? 'Enregistrer' : 'Créer')}
        </button>
      </div>
    </form>
  );
}
