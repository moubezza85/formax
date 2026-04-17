import React, { useState, useEffect } from 'react';
import { trainingService, userService, draftsService, packService } from '../services/api';
import { CheckCircle, Users, BookOpen, CreditCard, ChevronRight, ChevronLeft, Save, GraduationCap, DollarSign, Package } from 'lucide-react';

const steps = [
  { id: 1, title: 'Sélection', icon: BookOpen },
  { id: 2, title: 'Étudiants', icon: Users },
  { id: 3, title: 'Formateurs', icon: GraduationCap },
  { id: 4, title: 'Paiements Formateurs', icon: DollarSign },
  { id: 5, title: 'Modalités Étudiants', icon: CreditCard },
  { id: 6, title: 'Validation', icon: CheckCircle },
];

export default function LaunchTrainingWizard({ initialData, initialStep, draftName }) {
  const [currentStep, setCurrentStep] = useState(initialStep || 1);
  const [trainings, setTrainings] = useState([]);
  const [packs, setPacks] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [allTrainers, setAllTrainers] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [selectionMode, setSelectionMode] = useState('training'); // 'training' or 'pack'
  
  const [formData, setFormData] = useState(initialData || {
    trainingId: '',
    packId: '',
    selectedStudents: [],
    selectedTrainers: [],
    studentPayments: { mode: 'full', discount: 0, upfront: 0 }
  });

  useEffect(() => {
    trainingService.getTrainings().then(data => setTrainings(data.filter(t => !t.is_deleted)));
    packService.getPacks().then(data => setPacks(data.filter(p => !p.is_deleted)));
    userService.getStudents().then(setAllStudents);
    userService.getTrainers().then(setAllTrainers);
  }, []);

  const handleSaveDraft = async () => {
    const name = draftName || prompt('Nom de ce brouillon :');
    if (!name) return;
    
    setIsSaving(true);
    try {
      await draftsService.saveDraft({
        name,
        current_step: currentStep,
        data_json: formData
      });
      alert('Brouillon sauvegardé !');
    } catch (err) {
      alert('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, steps.length));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const toggleStudent = (id) => {
    setFormData(prev => ({
      ...prev,
      selectedStudents: prev.selectedStudents.includes(id) 
        ? prev.selectedStudents.filter(sid => sid !== id)
        : [...prev.selectedStudents, id]
    }));
  };

  const toggleTrainer = (id) => {
    const isSelected = formData.selectedTrainers.find(t => t.id === id);
    if (isSelected) {
      setFormData(prev => ({
        ...prev,
        selectedTrainers: prev.selectedTrainers.filter(t => t.id !== id)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        selectedTrainers: [...prev.selectedTrainers, { id, payment_mode: 'hourly', custom_rate: 0 }]
      }));
    }
  };

  const updateTrainerConfig = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      selectedTrainers: prev.selectedTrainers.map(t => t.id === id ? { ...t, [field]: value } : t)
    }));
  };

  const renderStep = () => {
    const selectedTraining = trainings.find(t => t.id === formData.trainingId);
    const selectedPack = packs.find(p => p.id === formData.packId);
    
    switch (currentStep) {
      case 1:
        return (
          <div className="wizard-step fade-in">
            <h2 className="mb-1">Étape 1: Sélectionner l'offre</h2>
            <div className="flex gap-1 mb-2">
              <button 
                className={`btn flex-1 ${selectionMode === 'training' ? 'btn-primary' : 'bg-glass'}`}
                onClick={() => setSelectionMode('training')}
              >
                <BookOpen size={18} /> Formation Isolée
              </button>
              <button 
                className={`btn flex-1 ${selectionMode === 'pack' ? 'btn-primary' : 'bg-glass'}`}
                onClick={() => setSelectionMode('pack')}
              >
                <Package size={18} /> Packs Promo
              </button>
            </div>

            <div className="flex flex-col gap-1 max-h-40 overflow-y-auto pr-0-5">
              {selectionMode === 'training' ? trainings.map(t => (
                <div 
                  key={t.id} 
                  className={`card cursor-pointer transition-all ${formData.trainingId === t.id ? 'border-primary' : ''}`}
                  onClick={() => setFormData({...formData, trainingId: t.id, packId: ''})}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-bold">{t.title}</h3>
                      <p className="text-sm text-muted">{t.total_hours} heures</p>
                    </div>
                    <div className="text-xl font-bold text-primary">{t.price} MAD</div>
                  </div>
                </div>
              )) : packs.map(p => {
                const totalHours = p.trainings.reduce((sum, t) => sum + (t.total_hours || 0), 0);
                const totalPrice = p.trainings.reduce((sum, t) => sum + t.price, 0) * (1 - p.discount_rate);
                return (
                  <div 
                    key={p.id} 
                    className={`card cursor-pointer transition-all ${formData.packId === p.id ? 'border-primary' : ''}`}
                    onClick={() => setFormData({...formData, packId: p.id, trainingId: ''})}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-bold">{p.name}</h3>
                        <p className="text-sm text-muted">{p.trainings.length} formations • {totalHours}h au total</p>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-primary">{Math.round(totalPrice)} MAD</div>
                        <div className="text-xs text-success font-bold">-{p.discount_rate * 100}% de remise</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      case 2:
        return (
          <div className="wizard-step fade-in">
            <h2>Étape 2: Ajouter des étudiants</h2>
            <div className="flex flex-col gap-1 mt-1 max-h-40 overflow-y-auto pr-0-5">
              {allStudents.map(s => (
                <div 
                  key={s.id} 
                  className={`card flex justify-between items-center cursor-pointer p-0-5 ${formData.selectedStudents.includes(s.id) ? 'bg-glass' : ''}`}
                  onClick={() => toggleStudent(s.id)}
                >
                  <span>{s.first_name} {s.last_name}</span>
                  <input type="checkbox" checked={formData.selectedStudents.includes(s.id)} readOnly />
                </div>
              ))}
            </div>
          </div>
        );
      case 3:
        return (
          <div className="wizard-step fade-in">
            <h2>Étape 3: Désigner les formateurs</h2>
            <div className="flex flex-col gap-1 mt-1 max-h-40 overflow-y-auto pr-0-5">
              {allTrainers.map(t => (
                <div 
                  key={t.id} 
                  className={`card flex justify-between items-center cursor-pointer p-0-5 ${formData.selectedTrainers.find(tr => tr.id === t.id) ? 'bg-glass' : ''}`}
                  onClick={() => toggleTrainer(t.id)}
                >
                  <span>{t.first_name} {t.last_name}</span>
                  <input type="checkbox" checked={!!formData.selectedTrainers.find(tr => tr.id === t.id)} readOnly />
                </div>
              ))}
            </div>
          </div>
        );
      case 4:
        return (
          <div className="wizard-step fade-in">
            <h2>Étape 4: Configuration Paies Formateurs</h2>
            <div className="flex flex-col gap-1 mt-1">
              {formData.selectedTrainers.map(tr => {
                const trainer = allTrainers.find(t => t.id === tr.id);
                return (
                  <div key={tr.id} className="card p-1">
                    <h3 className="font-bold mb-1">{trainer?.first_name} {trainer?.last_name}</h3>
                    <div className="flex gap-1">
                      <select 
                        className="input mb-0"
                        value={tr.payment_mode}
                        onChange={(e) => updateTrainerConfig(tr.id, 'payment_mode', e.target.value)}
                      >
                        <option value="hourly">Par Heure</option>
                        <option value="per_student">Par Étudiant</option>
                        <option value="fixed">Forfaitaire</option>
                        <option value="monthly">Mensuel</option>
                      </select>
                      <input 
                        type="number" 
                        placeholder="Tarif"
                        className="input mb-0"
                        value={tr.custom_rate}
                        onChange={(e) => updateTrainerConfig(tr.id, 'custom_rate', parseFloat(e.target.value))}
                      />
                    </div>
                  </div>
                );
              })}
              {formData.selectedTrainers.length === 0 && <p className="text-muted text-center p-1">Aucun formateur sélectionné.</p>}
            </div>
          </div>
        );
      case 5:
        return (
          <div className="wizard-step fade-in">
            <h2>Étape 5: Modalités Étudiants</h2>
            <div className="card mt-1 p-1 flex flex-col gap-1">
              <div>
                <label className="text-sm font-bold block mb-0-5">Mode de paiement</label>
                <select 
                  className="input"
                  value={formData.studentPayments.mode}
                  onChange={(e) => setFormData({...formData, studentPayments: {...formData.studentPayments, mode: e.target.value}})}
                >
                  <option value="full">Paiement Complet</option>
                  <option value="installment">Par Tranches</option>
                  <option value="monthly">Mensuel</option>
                  <option value="flexible">Flexible (automatique)</option>
                </select>
              </div>
              <div className="flex gap-1">
                <div className="flex-1">
                  <label className="text-sm font-bold block mb-0-5">Remise Supplémentaire (%)</label>
                  <input 
                    type="number" 
                    className="input"
                    value={formData.studentPayments.discount}
                    onChange={(e) => setFormData({...formData, studentPayments: {...formData.studentPayments, discount: parseFloat(e.target.value)}})}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-bold block mb-0-5">Acompte initial (MAD)</label>
                  <input 
                    type="number" 
                    className="input"
                    value={formData.studentPayments.upfront}
                    onChange={(e) => setFormData({...formData, studentPayments: {...formData.studentPayments, upfront: parseFloat(e.target.value)}})}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      case 6:
        return (
          <div className="wizard-step fade-in">
            <h2>Étape 6: Résumé et Validation</h2>
            <div className="card mt-1 flex flex-col gap-1">
              <div className="flex justify-between border-b pb-1">
                <span>Offre</span>
                <span className="font-bold text-primary">{selectedTraining?.title || selectedPack?.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Étudiants</span>
                <span className="tag tag-success">{formData.selectedStudents.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Formateurs</span>
                <span className="tag tag-warning">{formData.selectedTrainers.length}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-1 border-t">
                <span>Total Budget Étudiants</span>
                <span>{
                  selectedTraining 
                    ? (selectedTraining.price * formData.selectedStudents.length * (1 - (formData.studentPayments.discount / 100))).toLocaleString()
                    : (selectedPack?.trainings.reduce((sum, t) => sum + t.price, 0) * (1 - selectedPack?.discount_rate) * formData.selectedStudents.length * (1 - (formData.studentPayments.discount / 100))).toLocaleString()
                } MAD</span>
              </div>
              <button className="btn btn-primary mt-1 w-full" onClick={() => alert('Formation Lancée avec Succès !')}>
                Valider et Lancer
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="container p-0">
      <div className="card">
        <div className="flex justify-between items-center mb-1">
          <div className="wizard-progress overflow-x-auto pb-1 flex-1">
            {steps.map(step => (
              <div key={step.id} className="flex flex-col items-center min-w-10">
                <div className={`step-indicator ${currentStep >= step.id ? 'active' : ''}`}>
                  <step.icon size={18} />
                </div>
                <span className="text-xs mt-1 text-muted whitespace-nowrap">{step.id}. {step.title}</span>
              </div>
            ))}
          </div>
          <button className="btn bg-glass ml-2" onClick={handleSaveDraft} disabled={isSaving}>
            <Save size={18} /> {isSaving ? '...' : 'Sauvegarder'}
          </button>
        </div>
        
        <div className="min-h-30 mt-2">
          {renderStep()}
        </div>

        <div className="flex justify-between mt-2 pt-1 border-t border-surface-border">
          <button className="btn" onClick={prevStep} disabled={currentStep === 1}>
            <ChevronLeft size={18} /> Précédent
          </button>
          {currentStep < steps.length && (
            <button className="btn btn-primary" onClick={nextStep} disabled={currentStep === 1 && !formData.trainingId && !formData.packId}>
              Suivant <ChevronRight size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
