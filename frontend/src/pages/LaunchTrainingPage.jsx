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

      <div className="dashboard-grid grid-3">
        {drafts.map(draft => {
          const stats = draft.data_json || { trainers: [], students: [] };
          return (
            <div key={draft.id} className="card cursor-pointer hover:border-primary transition-all p-1-5 relative" onClick={() => handleSelectDraft(draft)}>
              <div className="flex justify-between items-start mb-1">
                <div className="p-1 rounded-xl bg-primary-light text-primary">
                  <Clock size={24} />
                </div>
                <button className="btn-icon text-error hover:bg-error/10 p-0-5 rounded-full" onClick={(e) => handleDeleteDraft(e, draft.id)}>
                  <Trash2 size={18} />
                </button>
              </div>
              <h3 className="font-bold text-lg mb-0-5">{draft.name}</h3>
              
              <div className="flex gap-1 mb-1">
                <div className="text-center bg-glass px-1 py-0-5 rounded flex-1">
                  <div className="text-sm font-bold text-primary">{stats.trainers?.length || 0}</div>
                  <div className="text-[10px] uppercase text-muted font-bold">Formateurs</div>
                </div>
                <div className="text-center bg-glass px-1 py-0-5 rounded flex-1">
                  <div className="text-sm font-bold text-success">{stats.students?.length || 0}</div>
                  <div className="text-[10px] uppercase text-muted font-bold">Étudiants</div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-1 pt-1 border-t border-surface-border">
                <div className="flex items-center gap-0-5 text-sm font-bold text-primary">
                  Étape {draft.current_step} / 5
                </div>
                <div className="text-[10px] text-muted font-bold">
                  {new Date(draft.updated_at).toLocaleDateString()}
                </div>
              </div>
              
              <div className="mt-1-5 btn btn-sm btn-primary w-full justify-center">
                Reprendre <ChevronRight size={14} />
              </div>
            </div>
          );
        })}
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
