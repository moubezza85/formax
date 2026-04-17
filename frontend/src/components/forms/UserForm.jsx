import React, { useState, useEffect } from 'react';
import { userService } from '../../services/api';

export default function UserForm({ user, role, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        password: '' // Don't populate password
      });
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (user) {
        // Update
        const { email, ...updateData } = formData;
        if (!updateData.password) delete updateData.password;
        await userService.updateUser(user.id, updateData);
      } else {
        // Create
        if (role === 'STUDENT') {
          await userService.createStudent(formData);
        } else {
          await userService.createTrainer(formData);
        }
      }
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.detail || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert alert-error mb-1">{error}</div>}
      
      <div className="flex gap-1 items-start">
        <div className="flex-1">
          <label className="text-sm font-bold block">Prénom</label>
          <input 
            type="text" 
            className="input" 
            value={formData.first_name}
            onChange={e => setFormData({...formData, first_name: e.target.value})}
            required 
          />
        </div>
        <div className="flex-1">
          <label className="text-sm font-bold block">Nom</label>
          <input 
            type="text" 
            className="input" 
            value={formData.last_name}
            onChange={e => setFormData({...formData, last_name: e.target.value})}
            required 
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-bold block">Email {user && <span className="text-xs text-muted">(Non modifiable)</span>}</label>
        <input 
          type="email" 
          className="input" 
          value={formData.email}
          onChange={e => setFormData({...formData, email: e.target.value})}
          disabled={!!user}
          required 
        />
      </div>

      <div>
        <label className="text-sm font-bold block">Téléphone</label>
        <input 
          type="text" 
          className="input" 
          value={formData.phone}
          onChange={e => setFormData({...formData, phone: e.target.value})}
        />
      </div>

      <div>
        <label className="text-sm font-bold block">Mot de passe {user && <span className="text-xs text-muted">(Laisser vide pour ne pas changer)</span>}</label>
        <input 
          type="password" 
          className="input" 
          value={formData.password}
          onChange={e => setFormData({...formData, password: e.target.value})}
          required={!user}
        />
      </div>

      <div className="flex justify-between gap-1 mt-1">
        <button type="button" onClick={onCancel} className="btn bg-glass flex-1">Annuler</button>
        <button type="submit" disabled={loading} className="btn btn-primary flex-1">
          {loading ? 'Chargement...' : (user ? 'Enregistrer' : 'Créer')}
        </button>
      </div>
    </form>
  );
}
