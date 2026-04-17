import React, { useState, useEffect } from 'react';
import { trainingService, sessionsService } from '../services/api';
import { PlayCircle, Clock, Users, ArrowRight, BarChart } from 'lucide-react';

export default function ActiveTrainingsPage() {
  const [activeTrainings, setActiveTrainings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveData();
  }, []);

  const fetchActiveData = async () => {
    try {
      const trainings = await trainingService.getTrainings();
      // Filter for trainings that have active status (logic could be refined based on enrollments)
      const active = trainings.filter(t => !t.is_deleted);
      
      // Enrich with progress
      const enriched = await Promise.all(active.map(async (t) => {
        try {
          const progress = await sessionsService.getProgress(t.id);
          return { ...t, ...progress };
        } catch {
          return { ...t, completed_hours: 0, progress_percent: 0 };
        }
      }));
      
      setActiveTrainings(enriched);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-2xl font-bold">Suivi des Formations Lancées</h1>
          <p className="text-muted">Visualisez l'état d'avancement de vos programmes actifs.</p>
        </div>
      </div>

      <div className="dashboard-grid">
        {activeTrainings.map(t => (
          <div key={t.id} className="card flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-1">
                <div className="p-1 rounded-lg bg-primary-light text-primary">
                  <PlayCircle size={24} />
                </div>
                <div className="tag tag-success">Lancée</div>
              </div>
              <h3 className="font-bold mb-0-5">{t.title}</h3>
              
              <div className="flex flex-col gap-0-5 mt-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted flex items-center gap-0-5"><Clock size={14} /> Heures effectuées</span>
                  <span className="font-bold">{t.completed_hours} / {t.total_hours}h</span>
                </div>
                <div className="h-0-5 w-full bg-glass rounded-lg overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${t.progress_percent}%` }}></div>
                </div>
              </div>
            </div>

            <div className="mt-2 pt-1 border-t border-surface-border flex justify-between items-center">
              <div className="flex items-center gap-0-5 text-sm text-muted">
                <BarChart size={14} />
                <span>{Math.round(t.progress_percent)}% terminés</span>
              </div>
              <button 
                className="btn btn-secondary bg-glass py-0-5 px-1"
                onClick={() => window.location.href = `/formations/sessions/${t.id}`}
              >
                Gérer les Séances <ArrowRight size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
