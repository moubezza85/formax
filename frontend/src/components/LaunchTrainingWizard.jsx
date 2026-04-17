import React, { useState, useEffect } from 'react';
import { trainingService, userService, draftsService } from '../services/api';
import {
  CheckCircle, Users, BookOpen, CreditCard,
  ChevronRight, ChevronLeft, Save, GraduationCap,
  Plus, Trash2, Info
} from 'lucide-react';

const steps = [
  { id: 1, title: 'Infos Formation', icon: BookOpen },
  { id: 2, title: 'Formateurs',      icon: GraduationCap },
  { id: 3, title: '\u00c9tudiants',        icon: Users },
  { id: 4, title: 'Paiements \u00c9tudiants', icon: CreditCard },
  { id: 5, title: 'R\u00e9capitulatif',   icon: CheckCircle },
];

export default function LaunchTrainingWizard({ initialData, initialStep, draftName }) {
  const [currentStep, setCurrentStep] = useState(initialStep || 1);
  const [trainings,   setTrainings]   = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [allTrainers, setAllTrainers] = useState([]);
  const [isSaving,    setIsSaving]    = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);

  const [formData, setFormData] = useState(initialData || {
    training: { id: null, title: '', description: '', price: 0, masse_horaire: 0 },
    trainers: [],
    students: []
  });

  const [newTrainer, setNewTrainer] = useState({
    first_name: '', last_name: '', email: '',
    payment_mode: 'hourly', rate: 0, is_primary: false
  });
  const [newStudent, setNewStudent] = useState({
    first_name: '', last_name: '', email: '', discount: 0
  });

  useEffect(() => {
    trainingService.getTrainings().then(data => setTrainings(data.filter(t => !t.is_deleted)));
    userService.getStudents().then(setAllStudents);
    userService.getTrainers().then(setAllTrainers);
  }, []);

  /* ── Sauvegarde brouillon ───────────────────── */
  const handleSaveDraft = async (manualName = null) => {
    const name = manualName || draftName || prompt('Nom de ce brouillon :');
    if (!name) return;
    setIsSaving(true);
    try {
      await draftsService.saveDraft({ name, current_step: currentStep, data_json: formData });
      if (!draftName && !manualName) alert('Brouillon sauvegard\u00e9 !');
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  /* ── Lancement ──────────────────────────────── */
  const handleLaunch = async () => {
    setIsLaunching(true);
    try {
      await trainingService.launchTraining(formData);
      alert('Formation lanc\u00e9e avec succ\u00e8s !');
      window.location.href = '/formations/active';
    } catch (err) {
      alert('Erreur lors du lancement : ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsLaunching(false);
    }
  };

  const nextStep = () => setCurrentStep(p => Math.min(p + 1, steps.length));
  const prevStep = () => setCurrentStep(p => Math.max(p - 1, 1));

  /* ── Formateurs ─────────────────────────────── */
  const addExistingTrainer = (t) => {
    if (formData.trainers.find(tr => tr.id === t.id)) return;
    const u = t.user || {};
    setFormData({ ...formData, trainers: [...formData.trainers, {
      id: t.id, first_name: u.first_name, last_name: u.last_name, email: u.email,
      payment_mode: t.default_payment_mode || 'hourly',
      rate: t.hourly_rate || 0,
      is_primary: formData.trainers.length === 0
    }]});
  };
  const addNewTrainer = () => {
    if (!newTrainer.first_name || !newTrainer.email) return;
    setFormData({ ...formData, trainers: [...formData.trainers,
      { ...newTrainer, id: null, is_primary: formData.trainers.length === 0 }
    ]});
    setNewTrainer({ first_name: '', last_name: '', email: '', payment_mode: 'hourly', rate: 0, is_primary: false });
  };
  const updateTrainer = (i, field, val) => {
    const t = [...formData.trainers]; t[i][field] = val;
    setFormData({ ...formData, trainers: t });
  };
  const removeTrainer = (i) =>
    setFormData({ ...formData, trainers: formData.trainers.filter((_, idx) => idx !== i) });

  /* ── Etudiants ──────────────────────────────── */
  const addExistingStudent = (s) => {
    if (formData.students.find(st => st.id === s.id)) return;
    const u = s.user || {};
    setFormData({ ...formData, students: [...formData.students, {
      id: s.id, first_name: u.first_name, last_name: u.last_name, email: u.email,
      discount: 0, payment_mode: 'full', upfront: 0
    }]});
  };
  const addNewStudent = () => {
    if (!newStudent.first_name || !newStudent.email) return;
    setFormData({ ...formData, students: [...formData.students,
      { ...newStudent, id: null, payment_mode: 'full', upfront: 0 }
    ]});
    setNewStudent({ first_name: '', last_name: '', email: '', discount: 0 });
  };
  const updateStudent = (i, field, val) => {
    const s = [...formData.students]; s[i][field] = val;
    setFormData({ ...formData, students: s });
  };
  const removeStudent = (i) =>
    setFormData({ ...formData, students: formData.students.filter((_, idx) => idx !== i) });

  /* ══════════════════════════════════════════════
     RENDER STEPS
  ══════════════════════════════════════════════ */
  const renderStep = () => {
    switch (currentStep) {

      /* ── STEP 1 : Infos Formation ──────────── */
      case 1:
        return (
          <div className="wizard-step fade-in">
            <h2 className="mb-1 flex items-center gap-0-5">
              <BookOpen size={20} className="text-primary" /> \u00c9tape 1\u00a0: Infos Formation
            </h2>
            <div className="card bg-glass mb-1" style={{padding:'1.25rem'}}>
              <label className="text-sm font-bold block mb-0-5">S\u00e9lectionner une formation existante</label>
              <select
                className="input"
                value={formData.training.id || ''}
                onChange={(e) => {
                  const t = trainings.find(tr => tr.id === parseInt(e.target.value));
                  if (t) setFormData({ ...formData, training: { ...t, id: t.id } });
                  else   setFormData({ ...formData, training: { id: null, title: '', description: '', price: 0, masse_horaire: 0 } });
                }}
              >
                <option value="">-- Cr\u00e9er une nouvelle formation --</option>
                {trainings.map(t => <option key={t.id} value={t.id}>{t.title} ({t.price} MAD)</option>)}
              </select>

              <div className="grid-2" style={{marginTop:'0.75rem'}}>
                <div className="col-span-2">
                  <label className="text-sm font-bold block mb-0-5">Titre de la formation</label>
                  <input type="text" className="input" placeholder="Ex\u00a0: React Masterclass"
                    value={formData.training.title}
                    onChange={e => setFormData({ ...formData, training: { ...formData.training, title: e.target.value }})}
                    disabled={!!formData.training.id} />
                </div>
                <div>
                  <label className="text-sm font-bold block mb-0-5">Prix Standard (MAD)</label>
                  <input type="number" className="input"
                    value={formData.training.price}
                    onChange={e => setFormData({ ...formData, training: { ...formData.training, price: parseFloat(e.target.value) }})}
                    disabled={!!formData.training.id} />
                </div>
                <div>
                  <label className="text-sm font-bold block mb-0-5">Masse Horaire (h)</label>
                  <input type="number" className="input"
                    value={formData.training.masse_horaire}
                    onChange={e => setFormData({ ...formData, training: { ...formData.training, masse_horaire: parseFloat(e.target.value) }})}
                    disabled={!!formData.training.id} />
                </div>
              </div>
            </div>
          </div>
        );

      /* ── STEP 2 : Formateurs ───────────────── */
      case 2:
        return (
          <div className="wizard-step fade-in">
            <h2 className="mb-1 flex items-center gap-0-5">
              <GraduationCap size={20} className="text-primary" /> \u00c9tape 2\u00a0: Formateurs
            </h2>

            {/* Deux colonnes : Existants | Nouveau inline */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
              marginBottom: '1.25rem'
            }}>
              {/* Colonne gauche : formateurs existants */}
              <div className="card bg-glass" style={{padding:'1rem'}}>
                <h3 className="text-sm font-bold mb-1">Rechercher / Ajouter existant</h3>
                <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem', maxHeight:'220px', overflowY:'auto', paddingRight:'4px' }}>
                  {allTrainers
                    .filter(t => !formData.trainers.find(tr => tr.id === t.id))
                    .map(t => (
                      <div key={t.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'white', padding:'0.5rem 0.75rem', borderRadius:'6px', border:'1px solid var(--surface-border)' }}>
                        <span className="text-sm">{t.user?.first_name} {t.user?.last_name}</span>
                        <button className="btn btn-sm btn-primary" onClick={() => addExistingTrainer(t)} style={{padding:'0.2rem 0.6rem'}}>
                          <Plus size={14} />
                        </button>
                      </div>
                    ))
                  }
                  {allTrainers.filter(t => !formData.trainers.find(tr => tr.id === t.id)).length === 0 && (
                    <p className="text-sm text-muted" style={{textAlign:'center', padding:'1rem 0'}}>Aucun formateur disponible</p>
                  )}
                </div>
              </div>

              {/* Colonne droite : nouveau formateur inline */}
              <div className="card" style={{padding:'1rem'}}>
                <h3 className="text-sm font-bold mb-1">Nouveau formateur (Inline)</h3>
                <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem' }}>
                  <div>
                    <label className="text-xs font-bold text-muted block" style={{marginBottom:'3px'}}>Pr\u00e9nom *</label>
                    <input type="text" className="input input-sm"
                      placeholder="Pr\u00e9nom"
                      value={newTrainer.first_name}
                      onChange={e => setNewTrainer({ ...newTrainer, first_name: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted block" style={{marginBottom:'3px'}}>Nom</label>
                    <input type="text" className="input input-sm"
                      placeholder="Nom"
                      value={newTrainer.last_name}
                      onChange={e => setNewTrainer({ ...newTrainer, last_name: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted block" style={{marginBottom:'3px'}}>Email *</label>
                    <input type="email" className="input input-sm"
                      placeholder="email@exemple.com"
                      value={newTrainer.email}
                      onChange={e => setNewTrainer({ ...newTrainer, email: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted block" style={{marginBottom:'3px'}}>Mode honoraire</label>
                    <select className="input input-sm"
                      value={newTrainer.payment_mode}
                      onChange={e => setNewTrainer({ ...newTrainer, payment_mode: e.target.value })}>
                      <option value="hourly">Horaire</option>
                      <option value="per_student">Par \u00e9tudiant</option>
                      <option value="fixed">Forfait</option>
                      <option value="monthly">Mensuel</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted block" style={{marginBottom:'3px'}}>Tarif par d\u00e9faut (MAD)</label>
                    <input type="number" className="input input-sm"
                      value={newTrainer.rate}
                      onChange={e => setNewTrainer({ ...newTrainer, rate: parseFloat(e.target.value) })} />
                  </div>
                  <button className="btn btn-primary w-full" style={{marginTop:'0.25rem'}} onClick={addNewTrainer}>
                    <Plus size={14} /> Ajouter au lancement
                  </button>
                </div>
              </div>
            </div>

            {/* Liste des formateurs sélectionnés */}
            {formData.trainers.length > 0 && (
              <div>
                <label className="text-sm font-bold" style={{display:'block', marginBottom:'0.75rem'}}>Formateurs s\u00e9lectionn\u00e9s :</label>
                <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
                  {formData.trainers.map((tr, idx) => (
                    <div key={idx} className="card" style={{ padding:'1rem', borderLeft:'4px solid var(--primary)' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.75rem' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                          <div style={{ padding:'0.4rem', borderRadius:'8px', background:'var(--primary-light)', color:'var(--primary)', display:'flex' }}>
                            <GraduationCap size={18} />
                          </div>
                          <div>
                            <div className="font-bold">{tr.first_name} {tr.last_name}</div>
                            <div className="text-xs text-muted">{tr.email}</div>
                          </div>
                        </div>
                        <button className="btn-icon text-error" onClick={() => removeTrainer(idx)}><Trash2 size={16} /></button>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'0.75rem' }}>
                        <div>
                          <label className="text-xs uppercase font-bold text-muted" style={{display:'block', marginBottom:'3px'}}>Mode Honoraire</label>
                          <select className="input input-sm" value={tr.payment_mode} onChange={e => updateTrainer(idx, 'payment_mode', e.target.value)}>
                            <option value="hourly">Horaire</option>
                            <option value="per_student">Par \u00e9tudiant</option>
                            <option value="fixed">Forfait</option>
                            <option value="monthly">Mensuel</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs uppercase font-bold text-muted" style={{display:'block', marginBottom:'3px'}}>Tarif (MAD)</label>
                          <input type="number" className="input input-sm" value={tr.rate} onChange={e => updateTrainer(idx, 'rate', parseFloat(e.target.value))} />
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', paddingTop:'1.2rem' }}>
                          <input type="checkbox" id={`primary-${idx}`} checked={tr.is_primary} onChange={e => updateTrainer(idx, 'is_primary', e.target.checked)} />
                          <label htmlFor={`primary-${idx}`} className="text-xs font-bold" style={{cursor:'pointer'}}>Primaire</label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {formData.trainers.length === 0 && (
              <p className="text-sm text-muted" style={{textAlign:'center', padding:'1rem', background:'#f8f9fa', borderRadius:'8px', border:'1px dashed var(--surface-border)'}}>
                Aucun formateur s\u00e9lectionn\u00e9 pour l\u2019instant.
              </p>
            )}
          </div>
        );

      /* ── STEP 3 : Etudiants ────────────────── */
      case 3:
        return (
          <div className="wizard-step fade-in">
            <h2 className="mb-1 flex items-center gap-0-5">
              <Users size={20} className="text-primary" /> \u00c9tape 3\u00a0: \u00c9tudiants
            </h2>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', marginBottom:'1.25rem' }}>
              {/* Existants */}
              <div className="card bg-glass" style={{padding:'1rem'}}>
                <h3 className="text-sm font-bold mb-1">Inscrire existants</h3>
                <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem', maxHeight:'220px', overflowY:'auto', paddingRight:'4px' }}>
                  {allStudents
                    .filter(s => !formData.students.find(st => st.id === s.id))
                    .map(s => (
                      <div key={s.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'white', padding:'0.5rem 0.75rem', borderRadius:'6px', border:'1px solid var(--surface-border)' }}>
                        <span className="text-sm">{s.user?.first_name} {s.user?.last_name}</span>
                        <button className="btn btn-sm btn-primary" onClick={() => addExistingStudent(s)} style={{padding:'0.2rem 0.6rem'}}>
                          <Plus size={14} />
                        </button>
                      </div>
                    ))
                  }
                  {allStudents.filter(s => !formData.students.find(st => st.id === s.id)).length === 0 && (
                    <p className="text-sm text-muted" style={{textAlign:'center', padding:'1rem 0'}}>Aucun \u00e9tudiant disponible</p>
                  )}
                </div>
              </div>

              {/* Nouveau inline */}
              <div className="card" style={{padding:'1rem'}}>
                <h3 className="text-sm font-bold mb-1">Nouveau compte \u00e9tudiant (Inline)</h3>
                <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem' }}>
                  <div>
                    <label className="text-xs font-bold text-muted block" style={{marginBottom:'3px'}}>Pr\u00e9nom *</label>
                    <input type="text" className="input input-sm" placeholder="Pr\u00e9nom"
                      value={newStudent.first_name}
                      onChange={e => setNewStudent({ ...newStudent, first_name: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted block" style={{marginBottom:'3px'}}>Nom</label>
                    <input type="text" className="input input-sm" placeholder="Nom"
                      value={newStudent.last_name}
                      onChange={e => setNewStudent({ ...newStudent, last_name: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted block" style={{marginBottom:'3px'}}>Email *</label>
                    <input type="email" className="input input-sm" placeholder="email@exemple.com"
                      value={newStudent.email}
                      onChange={e => setNewStudent({ ...newStudent, email: e.target.value })} />
                  </div>
                  <button className="btn btn-primary w-full" style={{marginTop:'0.25rem'}} onClick={addNewStudent}>
                    <Plus size={14} /> Cr\u00e9er et Inscrire
                  </button>
                </div>
              </div>
            </div>

            {formData.students.length > 0 && (
              <div>
                <label className="text-sm font-bold" style={{display:'block', marginBottom:'0.75rem'}}>\u00c9tudiants \u00e0 inscrire :</label>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
                  {formData.students.map((st, idx) => (
                    <div key={idx} className="card" style={{ padding:'1rem', borderLeft:'4px solid var(--success)' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.5rem' }}>
                        <div className="font-bold">{st.first_name} {st.last_name}</div>
                        <button className="btn-icon text-error" onClick={() => removeStudent(idx)}><Trash2 size={16} /></button>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                        <label className="text-sm">Remise (%)</label>
                        <input type="number" className="input input-sm" style={{width:'80px', marginBottom:0}}
                          value={st.discount}
                          onChange={e => updateStudent(idx, 'discount', parseFloat(e.target.value))} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {formData.students.length === 0 && (
              <p className="text-sm text-muted" style={{textAlign:'center', padding:'1rem', background:'#f8f9fa', borderRadius:'8px', border:'1px dashed var(--surface-border)'}}>
                Aucun \u00e9tudiant inscrit pour l\u2019instant.
              </p>
            )}
          </div>
        );

      /* ── STEP 4 : Paiements Etudiants ──────── */
      case 4:
        return (
          <div className="wizard-step fade-in">
            <h2 className="mb-1 flex items-center gap-0-5">
              <CreditCard size={20} className="text-primary" /> \u00c9tape 4\u00a0: Paiements \u00c9tudiants
            </h2>
            {formData.students.length === 0 && (
              <p className="text-sm text-muted" style={{textAlign:'center', padding:'2rem', background:'#f8f9fa', borderRadius:'8px'}}>
                Aucun \u00e9tudiant inscrit. Revenez \u00e0 l\u2019\u00e9tape 3.
              </p>
            )}
            <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              {formData.students.map((st, idx) => {
                const finalPrice = formData.training.price * (1 - (st.discount / 100));
                return (
                  <div key={idx} className="card" style={{padding:'1rem'}}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.75rem' }}>
                      <div className="font-bold">{st.first_name} {st.last_name}</div>
                      <div className="text-primary font-bold">{finalPrice.toLocaleString()} MAD</div>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'0.75rem' }}>
                      <div>
                        <label className="text-xs font-bold text-muted" style={{display:'block', marginBottom:'3px'}}>MODE</label>
                        <select className="input input-sm" value={st.payment_mode} onChange={e => updateStudent(idx, 'payment_mode', e.target.value)}>
                          <option value="full">Complet</option>
                          <option value="monthly">Mensuel</option>
                          <option value="installment">Tranches</option>
                          <option value="flexible">Flexible</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-muted" style={{display:'block', marginBottom:'3px'}}>ACOMPTE (MAD)</label>
                        <input type="number" className="input input-sm" value={st.upfront} onChange={e => updateStudent(idx, 'upfront', parseFloat(e.target.value))} />
                      </div>
                      {st.payment_mode === 'monthly' && (
                        <div>
                          <label className="text-xs font-bold text-muted" style={{display:'block', marginBottom:'3px'}}>MONTANT/MOIS</label>
                          <input type="number" className="input input-sm" value={st.monthly_amount || 0} onChange={e => updateStudent(idx, 'monthly_amount', parseFloat(e.target.value))} />
                        </div>
                      )}
                      {st.payment_mode === 'installment' && (
                        <div>
                          <label className="text-xs font-bold text-muted" style={{display:'block', marginBottom:'3px'}}>NB TRANCHES</label>
                          <input type="number" className="input input-sm" value={st.installment_count || 3} onChange={e => updateStudent(idx, 'installment_count', parseInt(e.target.value))} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      /* ── STEP 5 : Recap ────────────────────── */
      case 5:
        return (
          <div className="wizard-step fade-in">
            <h2 className="mb-1 flex items-center gap-0-5">
              <CheckCircle size={20} className="text-primary" /> \u00c9tape 5\u00a0: R\u00e9capitulatif
            </h2>
            <div className="grid-2 mb-1">
              <div className="card" style={{padding:'1rem'}}>
                <h3 className="text-sm font-bold text-muted mb-0-5 uppercase">Formation</h3>
                <div className="text-xl font-bold">{formData.training.title || '—'}</div>
                <div className="text-primary font-bold">{formData.training.price} MAD &bull; {formData.training.masse_horaire}h</div>
              </div>
              <div className="card" style={{padding:'1rem'}}>
                <h3 className="text-sm font-bold text-muted mb-0-5 uppercase">Statistiques</h3>
                <div style={{ display:'flex', gap:'1rem', marginTop:'0.5rem' }}>
                  <div style={{flex:1, textAlign:'center'}}>
                    <div className="text-lg font-bold">{formData.students.length}</div>
                    <div className="text-xs text-muted">\u00c9tudiants</div>
                  </div>
                  <div style={{flex:1, textAlign:'center'}}>
                    <div className="text-lg font-bold">{formData.trainers.length}</div>
                    <div className="text-xs text-muted">Formateurs</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card mb-1" style={{padding:'1rem'}}>
              <h3 className="text-sm font-bold mb-1" style={{borderBottom:'1px solid var(--surface-border)', paddingBottom:'0.5rem'}}>Sommaire financier estim\u00e9</h3>
              <div style={{ display:'flex', justifyContent:'space-between', padding:'0.4rem 0', borderBottom:'1px solid #f0f2f5' }}>
                <span>Chiffre d\u2019Affaire (CA) total :</span>
                <span className="font-bold text-success">
                  {formData.students.reduce((sum, st) => sum + (formData.training.price * (1 - st.discount / 100)), 0).toLocaleString()} MAD
                </span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', padding:'0.4rem 0', borderBottom:'1px solid #f0f2f5' }}>
                <span>Total Acomptes pr\u00e9vus :</span>
                <span className="font-bold">
                  {formData.students.reduce((sum, st) => sum + (st.upfront || 0), 0).toLocaleString()} MAD
                </span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', padding:'0.5rem 0 0.25rem' }}>
                <span className="font-bold">MARGE BRUTE (Estimation) :</span>
                <span className="font-bold text-primary text-lg">
                  {formData.students.reduce((sum, st) => sum + (formData.training.price * (1 - st.discount / 100)), 0).toLocaleString()} MAD
                </span>
              </div>
            </div>

            <button
              className="btn btn-primary btn-lg w-full"
              onClick={handleLaunch}
              disabled={isLaunching}
              style={{marginTop:'0.5rem'}}
            >
              <CheckCircle size={22} />
              {isLaunching ? 'Lancement en cours...' : 'LANCER LA FORMATION MAINTENANT'}
            </button>
          </div>
        );

      default: return null;
    }
  };

  /* ══════════════════════════════════════════════
     SHELL
  ══════════════════════════════════════════════ */
  return (
    <div className="container p-0">
      <div className="card border-0 shadow-lg overflow-hidden" style={{padding:0}}>

        {/* Header bleu */}
        <div style={{ background:'var(--primary)', padding:'1.25rem 1.5rem', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
            <div style={{ padding:'0.5rem', borderRadius:'10px', background:'rgba(255,255,255,0.2)', display:'flex' }}>
              <Info size={26} color="white" />
            </div>
            <div>
              <h1 style={{ color:'white', fontWeight:700, fontSize:'1.2rem', margin:0 }}>
                {draftName ? `Modification\u00a0: ${draftName}` : 'Assistant de Lancement'}
              </h1>
              <p style={{ color:'rgba(255,255,255,0.75)', fontSize:'0.85rem', margin:0 }}>
                Configurez votre formation en 5 \u00e9tapes rapides.
              </p>
            </div>
          </div>
          <button
            className="btn btn-sm"
            style={{ background:'rgba(255,255,255,0.2)', color:'white', border:'none' }}
            onClick={() => handleSaveDraft()}
            disabled={isSaving}
          >
            <Save size={16} /> {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>

        {/* Steps tabs */}
        <div style={{ display:'flex', borderBottom:'1px solid var(--surface-border)', background:'white', position:'sticky', top:0, zIndex:10 }}>
          {steps.map(step => (
            <div
              key={step.id}
              onClick={() => step.id < currentStep && setCurrentStep(step.id)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '0.75rem 0.5rem',
                cursor: step.id < currentStep ? 'pointer' : 'default',
                borderBottom: currentStep === step.id ? '3px solid var(--primary)' : '3px solid transparent',
                background: currentStep === step.id ? 'var(--primary-light)' : 'white',
                opacity: currentStep === step.id ? 1 : 0.55,
                transition: 'all 0.2s'
              }}
            >
              <step.icon size={18} color={currentStep === step.id ? 'var(--primary)' : undefined} />
              <span style={{ fontSize:'0.72rem', marginTop:'4px', fontWeight:700, color: currentStep === step.id ? 'var(--primary)' : undefined }}>
                {step.title}
              </span>
            </div>
          ))}
        </div>

        {/* Step content */}
        <div style={{ padding:'1.5rem', minHeight:'300px', background:'#fafbfc' }}>
          {renderStep()}
        </div>

        {/* Footer nav */}
        <div style={{ padding:'1rem 1.5rem', display:'flex', justifyContent:'space-between', background:'white', borderTop:'1px solid var(--surface-border)' }}>
          <button className="btn" style={{ background:'#f0f2f5', border:'1px solid var(--surface-border)' }}
            onClick={prevStep} disabled={currentStep === 1 || isLaunching}>
            <ChevronLeft size={18} /> Pr\u00e9c\u00e9dent
          </button>
          {currentStep < steps.length && (
            <button className="btn btn-primary" onClick={nextStep}
              disabled={(currentStep === 1 && (!formData.training.title || !formData.training.price)) || isLaunching}>
              Suivant <ChevronRight size={18} />
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
