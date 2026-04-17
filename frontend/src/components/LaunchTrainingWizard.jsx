import React, { useState, useEffect } from 'react';
import { trainingService, userService, draftsService, packService } from '../services/api';
import { CheckCircle, Users, BookOpen, CreditCard, ChevronRight, ChevronLeft, Save, GraduationCap, DollarSign, Package, Plus, Trash2, Mail, Phone, Info } from 'lucide-react';

const steps = [
  { id: 1, title: 'Infos Formation', icon: BookOpen },
  { id: 2, title: 'Formateurs', icon: GraduationCap },
  { id: 3, title: 'Étudiants', icon: Users },
  { id: 4, title: 'Paiements Étudiants', icon: CreditCard },
  { id: 5, title: 'Récapitulatif', icon: CheckCircle },
];

export default function LaunchTrainingWizard({ initialData, initialStep, draftName }) {
  const [currentStep, setCurrentStep] = useState(initialStep || 1);
  const [trainings, setTrainings] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [allTrainers, setAllTrainers] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  
  const [formData, setFormData] = useState(initialData || {
    training: { id: null, title: '', description: '', price: 0, masse_horaire: 0 },
    trainers: [],
    students: []
  });

  const [newTrainer, setNewTrainer] = useState({ first_name: '', last_name: '', email: '', payment_mode: 'hourly', rate: 0, is_primary: false });
  const [newStudent, setNewStudent] = useState({ first_name: '', last_name: '', email: '', discount: 0 });

  useEffect(() => {
    trainingService.getTrainings().then(data => setTrainings(data.filter(t => !t.is_deleted)));
    userService.getStudents().then(setAllStudents);
    userService.getTrainers().then(setAllTrainers);
  }, []);

  const handleSaveDraft = async (manualName = null) => {
    const name = manualName || draftName || prompt('Nom de ce brouillon :');
    if (!name) return;
    
    setIsSaving(true);
    try {
      await draftsService.saveDraft({
        name,
        current_step: currentStep,
        data_json: formData
      });
      if (!draftName && !manualName) alert('Brouillon sauvegardé !');
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLaunch = async () => {
    setIsLaunching(true);
    try {
      await trainingService.launchTraining(formData);
      alert('Formation lancée avec succès !');
      window.location.href = '/trainings/active';
    } catch (err) {
      alert('Erreur lors du lancement : ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsLaunching(false);
    }
  };

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, steps.length));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const addExistingTrainer = (t) => {
    if (formData.trainers.find(tr => tr.id === t.id)) return;
    const user = t.user || {};
    setFormData({
      ...formData,
      trainers: [...formData.trainers, { 
        id: t.id, 
        first_name: user.first_name, 
        last_name: user.last_name, 
        email: user.email,
        payment_mode: t.default_payment_mode || 'hourly',
        rate: t.hourly_rate || 0,
        is_primary: formData.trainers.length === 0
      }]
    });
  };

  const addNewTrainer = () => {
    if (!newTrainer.first_name || !newTrainer.email) return;
    setFormData({
      ...formData,
      trainers: [...formData.trainers, { ...newTrainer, id: null, is_primary: formData.trainers.length === 0 }]
    });
    setNewTrainer({ first_name: '', last_name: '', email: '', payment_mode: 'hourly', rate: 0, is_primary: false });
  };

  const addExistingStudent = (s) => {
    if (formData.students.find(st => st.id === s.id)) return;
    const user = s.user || {};
    setFormData({
      ...formData,
      students: [...formData.students, {
        id: s.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        discount: 0,
        payment_mode: 'full',
        upfront: 0
      }]
    });
  };

  const addNewStudent = () => {
    if (!newStudent.first_name || !newStudent.email) return;
    setFormData({
      ...formData,
      students: [...formData.students, { ...newStudent, id: null, payment_mode: 'full', upfront: 0 }]
    });
    setNewStudent({ first_name: '', last_name: '', email: '', discount: 0 });
  };

  const updateTrainer = (index, field, value) => {
    const updated = [...formData.trainers];
    updated[index][field] = value;
    setFormData({ ...formData, trainers: updated });
  };

  const updateStudent = (index, field, value) => {
    const updated = [...formData.students];
    updated[index][field] = value;
    setFormData({ ...formData, students: updated });
  };

  const removeTrainer = (index) => {
    setFormData({ ...formData, trainers: formData.trainers.filter((_, i) => i !== index) });
  };

  const removeStudent = (index) => {
    setFormData({ ...formData, students: formData.students.filter((_, i) => i !== index) });
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="wizard-step fade-in">
            <h2 className="mb-1 flex items-center gap-0-5"><BookOpen size={20} className="text-primary" /> Étape 1: Infos Formation</h2>
            <div className="card p-1-5 bg-glass mb-1">
              <label className="text-sm font-bold block mb-0-5">Sélectionner une formation existante</label>
              <select 
                className="input"
                value={formData.training.id || ''}
                onChange={(e) => {
                  const t = trainings.find(tr => tr.id === parseInt(e.target.value));
                  if (t) setFormData({...formData, training: { ...t, id: t.id }});
                  else setFormData({...formData, training: { id: null, title: '', description: '', price: 0, masse_horaire: 0 }});
                }}
              >
                <option value="">-- Créer une nouvelle formation --</option>
                {trainings.map(t => <option key={t.id} value={t.id}>{t.title} ({t.price} MAD)</option>)}
              </select>

              <div className="grid grid-2 gap-1 mt-1">
                <div className="col-span-2">
                  <label className="text-sm font-bold block mb-0-5">Titre de la formation</label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="Ex: React Masterclass"
                    value={formData.training.title}
                    onChange={(e) => setFormData({...formData, training: {...formData.training, title: e.target.value}})}
                    disabled={!!formData.training.id}
                  />
                </div>
                <div>
                  <label className="text-sm font-bold block mb-0-5">Prix Standard (MAD)</label>
                  <input 
                    type="number" 
                    className="input" 
                    value={formData.training.price}
                    onChange={(e) => setFormData({...formData, training: {...formData.training, price: parseFloat(e.target.value)}})}
                    disabled={!!formData.training.id}
                  />
                </div>
                <div>
                  <label className="text-sm font-bold block mb-0-5">Masse Horaire (h)</label>
                  <input 
                    type="number" 
                    className="input" 
                    value={formData.training.masse_horaire}
                    onChange={(e) => setFormData({...formData, training: {...formData.training, masse_horaire: parseFloat(e.target.value)}})}
                    disabled={!!formData.training.id}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="wizard-step fade-in">
            <h2 className="mb-1 flex items-center gap-0-5"><GraduationCap size={20} className="text-primary" /> Étape 2: Formateurs</h2>
            
            <div className="dashboard-grid grid-cols-1 md:grid-cols-2 gap-1 mb-1">
              <div className="card p-1 bg-glass border-dashed border-primary-light">
                <h3 className="text-sm font-bold mb-1">Rechercher / Ajouter existant</h3>
                <div className="flex flex-col gap-0-5 max-h-20 overflow-y-auto pr-0-5">
                  {allTrainers.filter(t => !formData.trainers.find(tr => tr.id === t.id)).map(t => (
                    <div key={t.id} className="flex justify-between items-center bg-surface p-0-5 rounded">
                      <span className="text-sm">{t.user?.first_name} {t.user?.last_name}</span>
                      <button className="btn-icon text-primary" onClick={() => addExistingTrainer(t)}><Plus size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card p-1 bg-glass">
                <h3 className="text-sm font-bold mb-1">Nouveau formateur (Inline)</h3>
                <div className="flex flex-col gap-0-5">
                  <input type="text" placeholder="Prénom" className="input input-sm" value={newTrainer.first_name} onChange={e => setNewTrainer({...newTrainer, first_name: e.target.value})} />
                  <input type="text" placeholder="Nom" className="input input-sm" value={newTrainer.last_name} onChange={e => setNewTrainer({...newTrainer, last_name: e.target.value})} />
                  <input type="email" placeholder="Email" className="input input-sm" value={newTrainer.email} onChange={e => setNewTrainer({...newTrainer, email: e.target.value})} />
                  <button className="btn btn-sm btn-primary w-full" onClick={addNewTrainer}><Plus size={14} /> Ajouter au lancement</button>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1 mt-1">
              <label className="text-sm font-bold">Formateurs sélectionnés :</label>
              {formData.trainers.map((tr, idx) => (
                <div key={idx} className="card p-1 flex flex-col gap-1 border-l-4 border-primary">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-1">
                      <div className="p-0-5 rounded bg-primary-light text-primary"><GraduationCap size={18} /></div>
                      <div>
                        <div className="font-bold">{tr.first_name} {tr.last_name}</div>
                        <div className="text-xs text-muted">{tr.email}</div>
                      </div>
                    </div>
                    <button className="btn-icon text-error" onClick={() => removeTrainer(idx)}><Trash2 size={16} /></button>
                  </div>
                  <div className="grid grid-3 gap-1 mt-0-5">
                    <div>
                      <label className="text-xs uppercase font-bold text-muted">Mode Honoraire</label>
                      <select className="input input-sm" value={tr.payment_mode} onChange={e => updateTrainer(idx, 'payment_mode', e.target.value)}>
                        <option value="hourly">Horaire</option>
                        <option value="per_student">Par étudiant</option>
                        <option value="fixed">Forfait</option>
                        <option value="monthly">Mensuel</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs uppercase font-bold text-muted">Tarif (MAD)</label>
                      <input type="number" className="input input-sm" value={tr.rate} onChange={e => updateTrainer(idx, 'rate', parseFloat(e.target.value))} />
                    </div>
                    <div className="flex items-center gap-0-5 pt-1">
                      <input type="checkbox" checked={tr.is_primary} onChange={e => updateTrainer(idx, 'is_primary', e.target.checked)} />
                      <label className="text-xs font-bold">Primaire ?</label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 3:
        return (
          <div className="wizard-step fade-in">
            <h2 className="mb-1 flex items-center gap-0-5"><Users size={20} className="text-primary" /> Étape 3: Étudiants</h2>
            
            <div className="dashboard-grid grid-cols-1 md:grid-cols-2 gap-1 mb-1">
              <div className="card p-1 bg-glass border-dashed border-primary-light">
                <h3 className="text-sm font-bold mb-1">Inscrire existants</h3>
                <div className="flex flex-col gap-0-5 max-h-20 overflow-y-auto pr-0-5">
                  {allStudents.filter(s => !formData.students.find(st => st.id === s.id)).map(s => (
                    <div key={s.id} className="flex justify-between items-center bg-surface p-0-5 rounded">
                      <span className="text-sm">{s.user?.first_name} {s.user?.last_name}</span>
                      <button className="btn-icon text-primary" onClick={() => addExistingStudent(s)}><Plus size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card p-1 bg-glass">
                <h3 className="text-sm font-bold mb-1">Nouveau compte étudiant (Inline)</h3>
                <div className="flex flex-col gap-0-5">
                  <input type="text" placeholder="Prénom" className="input input-sm" value={newStudent.first_name} onChange={e => setNewStudent({...newStudent, first_name: e.target.value})} />
                  <input type="text" placeholder="Nom" className="input input-sm" value={newStudent.last_name} onChange={e => setNewStudent({...newStudent, last_name: e.target.value})} />
                  <input type="email" placeholder="Email" className="input input-sm" value={newStudent.email} onChange={e => setNewStudent({...newStudent, email: e.target.value})} />
                  <button className="btn btn-sm btn-primary w-full" onClick={addNewStudent}><Plus size={14} /> Créer et Inscrire</button>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1 mt-1">
              <label className="text-sm font-bold">Étudiants à inscrire :</label>
              <div className="dashboard-grid grid-cols-1 md:grid-cols-2 gap-1">
                {formData.students.map((st, idx) => (
                  <div key={idx} className="card p-1 border-l-4 border-success flex flex-col gap-0-5">
                    <div className="flex justify-between">
                      <div className="font-bold">{st.first_name} {st.last_name}</div>
                      <button className="text-error" onClick={() => removeStudent(idx)}><Trash2 size={16} /></button>
                    </div>
                    <div className="flex items-center gap-0-5 text-sm">
                      <label>Remise (%)</label>
                      <input type="number" className="input input-sm mb-0 w-20" value={st.discount} onChange={e => updateStudent(idx, 'discount', parseFloat(e.target.value))} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="wizard-step fade-in">
            <h2 className="mb-1 flex items-center gap-0-5"><CreditCard size={20} className="text-primary" /> Étape 4: Paiements Étudiants</h2>
            <div className="flex flex-col gap-1">
              {formData.students.map((st, idx) => {
                const finalPrice = formData.training.price * (1 - (st.discount / 100));
                return (
                  <div key={idx} className="card p-1 flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <div className="font-bold">{st.first_name} {st.last_name}</div>
                      <div className="text-primary font-bold">{finalPrice.toLocaleString()} MAD</div>
                    </div>
                    <div className="grid grid-3 gap-1">
                      <div>
                        <label className="text-xs font-bold text-muted">MODE</label>
                        <select className="input input-sm mb-0" value={st.payment_mode} onChange={e => updateStudent(idx, 'payment_mode', e.target.value)}>
                          <option value="full">Complet</option>
                          <option value="monthly">Mensuel</option>
                          <option value="installment">Tranches</option>
                          <option value="flexible">Flexible</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-muted">ACOMPTE (MAD)</label>
                        <input type="number" className="input input-sm mb-0" value={st.upfront} onChange={e => updateStudent(idx, 'upfront', parseFloat(e.target.value))} />
                      </div>
                      {st.payment_mode === 'monthly' && (
                        <div>
                          <label className="text-xs font-bold text-muted">MONTANT/MOIS</label>
                          <input type="number" className="input input-sm mb-0" value={st.monthly_amount || 0} onChange={e => updateStudent(idx, 'monthly_amount', parseFloat(e.target.value))} />
                        </div>
                      )}
                      {st.payment_mode === 'installment' && (
                        <div>
                          <label className="text-xs font-bold text-muted">NB TRANCHES</label>
                          <input type="number" className="input input-sm mb-0" value={st.installment_count || 3} onChange={e => updateStudent(idx, 'installment_count', parseInt(e.target.value))} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      case 5:
        return (
          <div className="wizard-step fade-in">
            <h2 className="mb-1 flex items-center gap-0-5"><CheckCircle size={20} className="text-primary" /> Étape 5: Récapitulatif</h2>
            <div className="grid grid-2 gap-1 mb-1">
              <div className="card p-1">
                <h3 className="text-sm font-bold text-muted mb-0-5 uppercase">Formation</h3>
                <div className="text-xl font-bold">{formData.training.title}</div>
                <div className="text-primary font-bold">{formData.training.price} MAD • {formData.training.masse_horaire}h</div>
              </div>
              <div className="card p-1">
                <h3 className="text-sm font-bold text-muted mb-0-5 uppercase">Statistiques</h3>
                <div className="flex gap-1 mt-0-5">
                   <div className="flex-1 text-center">
                      <div className="text-lg font-bold">{formData.students.length}</div>
                      <div className="text-xs text-muted">Étudiants</div>
                   </div>
                   <div className="flex-1 text-center">
                      <div className="text-lg font-bold">{formData.trainers.length}</div>
                      <div className="text-xs text-muted">Formateurs</div>
                   </div>
                </div>
              </div>
            </div>

            <div className="card p-1 mb-1">
              <h3 className="text-sm font-bold mb-1 border-b pb-0-5">Sommaire financier estimé</h3>
              <div className="flex justify-between py-0-5">
                <span>Chiffre d'Affaire (CA) total :</span>
                <span className="font-bold text-success">
                  {formData.students.reduce((sum, st) => sum + (formData.training.price * (1 - st.discount / 100)), 0).toLocaleString()} MAD
                </span>
              </div>
              <div className="flex justify-between py-0-5">
                <span>Total Acomptes prévus :</span>
                <span className="font-bold">
                  {formData.students.reduce((sum, st) => sum + st.upfront, 0).toLocaleString()} MAD
                </span>
              </div>
              <div className="flex justify-between py-0-5 border-t mt-0-5 pt-0-5">
                <span className="font-bold">MARGE BRUTE (Estimation) :</span>
                <span className="font-bold text-primary text-lg">
                  {(formData.students.reduce((sum, st) => sum + (formData.training.price * (1 - st.discount / 100)), 0) - 0).toLocaleString()} MAD
                </span>
              </div>
            </div>

            <button className="btn btn-primary btn-lg w-full flex items-center justify-center gap-1" onClick={handleLaunch} disabled={isLaunching}>
              <CheckCircle size={24} /> {isLaunching ? 'Lancement en cours...' : 'LANCER LA FORMATION MAINTENANT'}
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="container p-0">
      <div className="card border-0 shadow-lg overflow-hidden">
        <div className="bg-primary p-2 flex justify-between items-center text-white">
          <div className="flex items-center gap-1">
             <div className="p-1 rounded-xl bg-white/20"><Info size={28} /></div>
             <div>
                <h1 className="text-xl font-bold">
                  {draftName ? `Modification : ${draftName}` : 'Assistant de Lancement'}
                </h1>
                <p className="text-sm text-white/70">Configurez votre formation en 5 étapes rapides.</p>
             </div>
          </div>
          <button className="btn bg-white/20 hover:bg-white/30 text-white flex items-center gap-0-5" onClick={() => handleSaveDraft()} disabled={isSaving}>
            <Save size={18} /> {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>

        <div className="flex border-b border-surface-border bg-white sticky top-0 z-10">
          {steps.map(step => (
            <div 
              key={step.id} 
              className={`flex-1 flex flex-col items-center py-1 cursor-pointer transition-all ${currentStep === step.id ? 'border-b-4 border-primary bg-primary-light/10' : 'opacity-50 hover:opacity-100'}`}
              onClick={() => step.id < currentStep && setCurrentStep(step.id)}
            >
              <step.icon size={20} className={currentStep === step.id ? 'text-primary' : ''} />
              <span className={`text-xs mt-0-5 font-bold ${currentStep === step.id ? 'text-primary' : ''}`}>{step.title}</span>
            </div>
          ))}
        </div>
        
        <div className="p-2 min-h-40 bg-surface/50">
          {renderStep()}
        </div>

        <div className="p-1-5 flex justify-between bg-white border-t border-surface-border">
          <button className="btn bg-glass border" onClick={prevStep} disabled={currentStep === 1 || isLaunching}>
            <ChevronLeft size={18} /> Précédent
          </button>
          {currentStep < steps.length && (
            <button className="btn btn-primary" onClick={nextStep} disabled={currentStep === 1 && (!formData.training.title || !formData.training.price) || isLaunching}>
              Suivant <ChevronRight size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
