import React, { useState, useEffect } from 'react';
import LaunchTrainingWizard from '../components/LaunchTrainingWizard';
import { draftsService } from '../services/api';
import { Save, Plus, Trash2, Clock, ChevronRight } from 'lucide-react';

export default function LaunchTrainingPage() {
  const [drafts, setDrafts] = useState([]);
  const [selectedDraft, setSelectedDraft] = useState(null);
  const [isStartingNew, setIsStartingNew] = useState(false);

  useEffect(() => {
    fetchDrafts();
  }, []);

  const fetchDrafts = async () => {
    try {
      const data = await draftsService.getDrafts();
      setDrafts(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectDraft = (draft) => {
    setSelectedDraft(draft);
    setIsStartingNew(true);
  };

  const handleNew = () => {
    setSelectedDraft(null);
    setIsStartingNew(true);
  };

  const handleDeleteDraft = async (e, id) => {
    e.stopPropagation();
    if (window.confirm('Supprimer ce brouillon ?')) {
      await draftsService.deleteDraft(id);
      fetchDrafts();
    }
  };

  if (isStartingNew) {
    return (
      <div className="fade-in">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-2xl font-bold">Lancer une Formation</h1>
          <button className="btn bg-glass" onClick={() => setIsStartingNew(false)}>Retour aux brouillons</button>
        </div>
        <LaunchTrainingWizard initialData={selectedDraft?.data_json} initialStep={selectedDraft?.current_step} draftName={selectedDraft?.name} />
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-2xl font-bold">Lancer une Formation</h1>
          <p className="text-muted">Commencez un nouveau lancement ou reprenez un brouillon.</p>
        </div>
        <button className="btn btn-primary" onClick={handleNew}>
          <Plus size={18} /> Nouveau Lancement
        </button>
      </div>

      <div className="dashboard-grid">
        {drafts.map(draft => (
          <div key={draft.id} className="card cursor-pointer hover:border-primary transition-all" onClick={() => handleSelectDraft(draft)}>
            <div className="flex justify-between items-start mb-1">
              <div className="p-1 rounded-lg bg-primary-light text-primary">
                <Save size={24} />
              </div>
              <button className="btn-icon text-error" onClick={(e) => handleDeleteDraft(e, draft.id)}>
                <Trash2 size={18} />
              </button>
            </div>
            <h3 className="font-bold">{draft.name}</h3>
            <div className="flex items-center gap-0-5 text-sm text-muted mt-1">
              <Clock size={14} />
              <span>Dernière modification : {new Date(draft.updated_at).toLocaleDateString()}</span>
            </div>
            <div className="mt-2 text-primary font-bold flex items-center gap-0-5">
              Reprendre à l'étape {draft.current_step} <ChevronRight size={16} />
            </div>
          </div>
        ))}
        {drafts.length === 0 && (
          <div className="col-span-full card text-center p-3 text-muted">
            <p>Aucun brouillon enregistré.</p>
            <button className="btn btn-primary mt-1 mx-auto" onClick={handleNew}>Lancer ma première formation</button>
          </div>
        )}
      </div>
    </div>
  );
}
