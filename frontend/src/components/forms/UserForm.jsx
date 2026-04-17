import React, { useState, useEffect } from 'react';
import { userService } from '../../services/api';

const PAYMENT_MODES = [
  { value: 'hourly', label: 'Par heure' },
  { value: 'per_student', label: 'Par étudiant' },
  { value: 'fixed', label: 'Forfait fixe par formation' },
  { value: 'monthly', label: 'Mensualité' },
];

const TRAINER_LEVELS = ['Junior', 'Intermédiaire', 'Senior', 'Expert'];

export default function UserForm({ user, role, onSuccess, onCancel }) {
  const isTrainer = role === 'TRAINER';
  const isStudent = role === 'STUDENT';

  // helper: quand user est un objet imbriqué (TrainerOut / StudentOut)
  const usr = user ? (user.user || user) : null;
  const profile = user || null;

  const [formData, setFormData] = useState({
    // champs User
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    // champs Student
    parent_phone: '',
    specialty: '',
    // champs Trainer
    level: '',
    default_payment_mode: 'hourly',
    hourly_rate: '',
    price_per_student: '',
    fixed_price_per_training: '',
    monthly_salary: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: usr?.first_name || '',
        last_name: usr?.last_name || '',
        email: usr?.email || '',
        phone: usr?.phone || '',
        password: '',
        // student
        parent_phone: profile?.parent_phone || '',
        specialty: profile?.specialty || '',
        // trainer
        level: profile?.level || '',
        default_payment_mode: profile?.default_payment_mode || 'hourly',
        hourly_rate: profile?.hourly_rate ?? '',
        price_per_student: profile?.price_per_student ?? '',
        fixed_price_per_training: profile?.fixed_price_per_training ?? '',
        monthly_salary: profile?.monthly_salary ?? '',
      });
    }
  }, [user]);

  const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        ...(formData.password ? { password: formData.password } : {}),
        ...(isStudent ? {
          parent_phone: formData.parent_phone,
          specialty: formData.specialty,
        } : {}),
        ...(isTrainer ? {
          specialty: formData.specialty,
          level: formData.level,
          default_payment_mode: formData.default_payment_mode,
          hourly_rate: parseFloat(formData.hourly_rate) || 0,
          price_per_student: parseFloat(formData.price_per_student) || 0,
          fixed_price_per_training: parseFloat(formData.fixed_price_per_training) || 0,
          monthly_salary: parseFloat(formData.monthly_salary) || 0,
        } : {}),
      };

      if (user) {
        const { email, ...updateData } = payload;
        await userService.updateUser(usr.id || user.id, updateData);
      } else {
        if (isStudent) {
          await userService.createStudent(payload);
        } else {
          await userService.createTrainer(payload);
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

      {/* Nom / Prénom */}
      <div className="flex gap-1 items-start">
        <div className="flex-1">
          <label className="text-sm font-bold block">Prénom *</label>
          <input type="text" className="input" value={formData.first_name}
            onChange={e => set('first_name', e.target.value)} required />
        </div>
        <div className="flex-1">
          <label className="text-sm font-bold block">Nom *</label>
          <input type="text" className="input" value={formData.last_name}
            onChange={e => set('last_name', e.target.value)} required />
        </div>
      </div>

      {/* Email */}
      <div>
        <label className="text-sm font-bold block">
          Email * {user && <span className="text-xs text-muted">(Non modifiable)</span>}
        </label>
        <input type="email" className="input" value={formData.email}
          onChange={e => set('email', e.target.value)}
          disabled={!!user} required />
      </div>

      {/* Téléphone */}
      <div className="flex gap-1 items-start">
        <div className="flex-1">
          <label className="text-sm font-bold block">Téléphone</label>
          <input type="text" className="input" value={formData.phone}
            onChange={e => set('phone', e.target.value)} />
        </div>
        {isStudent && (
          <div className="flex-1">
            <label className="text-sm font-bold block">Tél. Parent</label>
            <input type="text" className="input" value={formData.parent_phone}
              onChange={e => set('parent_phone', e.target.value)} />
          </div>
        )}
      </div>

      {/* Spécialité (student + trainer) */}
      <div>
        <label className="text-sm font-bold block">Spécialité</label>
        <input type="text" className="input" value={formData.specialty}
          placeholder={isTrainer ? 'ex: Développement Web, Comptabilité...' : 'ex: Informatique, Commerce...'}
          onChange={e => set('specialty', e.target.value)} />
      </div>

      {/* Champs Trainer uniquement */}
      {isTrainer && (
        <>
          <div className="flex gap-1 items-start">
            <div className="flex-1">
              <label className="text-sm font-bold block">Niveau</label>
              <select className="input" value={formData.level} onChange={e => set('level', e.target.value)}>
                <option value="">-- Sélectionner --</option>
                {TRAINER_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-bold block">Mode honoraire par défaut</label>
              <select className="input" value={formData.default_payment_mode}
                onChange={e => set('default_payment_mode', e.target.value)}>
                {PAYMENT_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1">
            <div>
              <label className="text-sm font-bold block">Taux horaire (MAD/h)</label>
              <input type="number" min="0" step="0.01" className="input"
                value={formData.hourly_rate}
                onChange={e => set('hourly_rate', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-bold block">Prix par étudiant (MAD)</label>
              <input type="number" min="0" step="0.01" className="input"
                value={formData.price_per_student}
                onChange={e => set('price_per_student', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-bold block">Forfait par formation (MAD)</label>
              <input type="number" min="0" step="0.01" className="input"
                value={formData.fixed_price_per_training}
                onChange={e => set('fixed_price_per_training', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-bold block">Salaire mensuel (MAD)</label>
              <input type="number" min="0" step="0.01" className="input"
                value={formData.monthly_salary}
                onChange={e => set('monthly_salary', e.target.value)} />
            </div>
          </div>
        </>
      )}

      {/* Mot de passe */}
      <div>
        <label className="text-sm font-bold block">
          Mot de passe {user && <span className="text-xs text-muted">(Laisser vide pour ne pas changer)</span>}
        </label>
        <input type="password" className="input" value={formData.password}
          onChange={e => set('password', e.target.value)}
          required={!user} />
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
