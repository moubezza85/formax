import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { sessionsService, trainingService, userService, attendanceService } from '../services/api';
import { Plus, CheckSquare, Calendar, Clock, UserCheck, AlertCircle, XCircle, FileText, ChevronRight, BarChart3 } from 'lucide-react';
import Modal from '../components/Modal';

export default function SessionDetailsPage() {
  const { id } = useParams();
  const [training, setTraining] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [students, setStudents] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('sessions'); // 'sessions' or 'heatmap'

  const [newSession, setNewSession] = useState({
    trainer_id: '',
    date: new Date().toISOString().slice(0, 16),
    duration_hours: 2,
    room: '',
    attendance: {}, // { student_id: { is_present: boolean, justification: string } }
  });

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const t = await trainingService.getTrainings();
      const current = t.find(item => item.id === parseInt(id));
      setTraining(current);
      
      const sess = await sessionsService.getSessions(id);
      setSessions(sess.sort((a, b) => new Date(b.date) - new Date(a.date)));

      const allStudents = await userService.getStudents();
      setStudents(allStudents);

      const allTrainers = await userService.getTrainers();
      setTrainers(allTrainers);

      const summary = await attendanceService.getTrainingSummary(id);
      setAttendanceSummary(summary);
      
      // Initialize attendance for new session
      const initialAttendance = {};
      allStudents.forEach(stu => {
        initialAttendance[stu.id] = { is_present: true, justification: '' };
      });
      setNewSession(prev => ({ ...prev, attendance: initialAttendance }));

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSession = async (e) => {
    e.preventDefault();
    try {
      const sess = await sessionsService.createSession({
        training_id: parseInt(id),
        trainer_id: parseInt(newSession.trainer_id),
        date: new Date(newSession.date).toISOString(),
        duration_hours: parseFloat(newSession.duration_hours),
        room: newSession.room,
        status: 'completed'
      });

      const attendanceData = students.map(stu => ({
        session_id: sess.id,
        student_id: stu.id,
        is_present: newSession.attendance[stu.id].is_present,
        justification: newSession.attendance[stu.id].is_present ? null : newSession.attendance[stu.id].justification
      }));
      await attendanceService.recordBulk(attendanceData);

      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      alert('Erreur lors de l\'enregistrement');
    }
  };

  const toggleAttendance = (stuId) => {
    setNewSession(prev => ({
      ...prev,
      attendance: { 
        ...prev.attendance, 
        [stuId]: { ...prev.attendance[stuId], is_present: !prev.attendance[stuId].is_present } 
      }
    }));
  };

  const updateJustification = (stuId, val) => {
    setNewSession(prev => ({
      ...prev,
      attendance: { 
        ...prev.attendance, 
        [stuId]: { ...prev.attendance[stuId], justification: val } 
      }
    }));
  };

  const completedSessions = sessions.filter(s => s.status === 'completed').sort((a,b) => new Date(a.date) - new Date(b.date));

  return (
    <div className="fade-in">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-2xl font-bold">{training?.title}</h1>
          <div className="flex gap-1 mt-0-5">
            <button 
              className={`text-sm font-bold pb-0-5 border-b-2 transition-all ${activeTab === 'sessions' ? 'border-primary text-primary' : 'border-transparent text-muted'}`}
              onClick={() => setActiveTab('sessions')}
            >
              Liste des Séances
            </button>
            <button 
              className={`text-sm font-bold pb-0-5 border-b-2 transition-all ${activeTab === 'heatmap' ? 'border-primary text-primary' : 'border-transparent text-muted'}`}
              onClick={() => setActiveTab('heatmap')}
            >
              Tableau des Présences
            </button>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} /> Nouvelle Séance
        </button>
      </div>

      {activeTab === 'sessions' ? (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-glass text-muted text-sm uppercase">
              <tr>
                <th className="p-1">Date</th>
                <th className="p-1">Durée</th>
                <th className="p-1">Salle</th>
                <th className="p-1">Statut</th>
                <th className="p-1 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map(s => (
                <tr key={s.id} className="border-t border-surface-border">
                  <td className="p-1 flex items-center gap-0-5 font-medium"><Calendar size={14} /> {new Date(s.date).toLocaleDateString()}</td>
                  <td className="p-1 font-bold">{s.duration_hours}h</td>
                  <td className="p-1">{s.room || 'N/A'}</td>
                  <td className="p-1">
                    <span className={`tag ${s.status === 'completed' ? 'tag-success' : 'tag-warning'}`}>
                      {s.status === 'completed' ? 'Réalisée' : 'Planifiée'}
                    </span>
                  </td>
                  <td className="p-1 text-center font-bold">
                    <button className="btn-icon text-primary mx-auto" title="Voir détails"><FileText size={18} /></button>
                  </td>
                </tr>
              ))}
              {sessions.length === 0 && (
                <tr><td colSpan="5" className="p-3 text-center text-muted">Aucune séance enregistrée.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-left border-collapse">
            <thead className="bg-glass sticky top-0">
              <tr>
                <th className="p-1 min-w-15 border-r border-surface-border">Étudiants</th>
                {completedSessions.map((s, idx) => (
                  <th key={s.id} className="p-1 text-center text-xs border-r border-surface-border min-w-4" title={new Date(s.date).toLocaleDateString()}>
                    S{idx + 1}
                  </th>
                ))}
                <th className="p-1 text-center font-bold text-primary">%</th>
              </tr>
            </thead>
            <tbody>
              {attendanceSummary.map(row => (
                <tr key={row.student_id} className="border-t border-surface-border hover:bg-glass">
                  <td className="p-1 font-medium border-r border-surface-border">{row.student_name}</td>
                  {completedSessions.map(s => {
                    const record = row.history.find(h => h.session_id === s.id);
                    return (
                      <td key={s.id} className="p-1 text-center border-r border-surface-border">
                        {record?.is_present ? (
                          <div className="w-1-5 h-1-5 bg-success rounded-full mx-auto" title="Présent"></div>
                        ) : record ? (
                          <div className="w-1-5 h-1-5 bg-error rounded-full mx-auto" title={record.justification || 'Absent'}></div>
                        ) : (
                          <div className="w-1-5 h-1-5 bg-glass rounded-full mx-auto"></div>
                        )}
                      </td>
                    );
                  })}
                  <td className="p-1 text-center font-bold text-sm">
                    {Math.round(row.attendance_rate)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-1 text-xs text-muted flex gap-1 bg-glass">
             <div className="flex items-center gap-0-5"><div className="w-1 h-1 bg-success rounded-full"></div> Présent</div>
             <div className="flex items-center gap-0-5"><div className="w-1 h-1 bg-error rounded-full"></div> Absent</div>
          </div>
        </div>
      )}

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Enregistrer une Séance Réalisée"
        className="modal-lg"
      >
        <form onSubmit={handleAddSession}>
          <div className="grid grid-cols-2 gap-1 mb-1">
            <div className="flex flex-col">
              <label className="text-sm font-bold block">Date et Heure</label>
              <input 
                type="datetime-local" 
                className="input mb-0" 
                value={newSession.date}
                onChange={e => setNewSession({...newSession, date: e.target.value})}
                required 
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-bold block">Durée (Heures)</label>
              <input 
                type="number" 
                className="input mb-0" 
                value={newSession.duration_hours}
                onChange={e => setNewSession({...newSession, duration_hours: e.target.value})}
                required 
              />
            </div>
          </div>

          <div className="mb-1">
            <label className="text-sm font-bold block">Formateur</label>
            <select 
              className="input mb-0" 
              value={newSession.trainer_id}
              onChange={e => setNewSession({...newSession, trainer_id: e.target.value})}
              required
            >
              <option value="">Sélectionner...</option>
              {trainers.map(tr => <option key={tr.id} value={tr.id}>{tr.first_name} {tr.last_name}</option>)}
            </select>
          </div>

          <div className="mb-1">
            <label className="text-sm font-bold block">Salle (Optionnel)</label>
            <input 
              type="text" 
              className="input" 
              placeholder="Ex: Salle A1"
              value={newSession.room}
              onChange={e => setNewSession({...newSession, room: e.target.value})}
            />
          </div>

          <div className="pt-1">
            <h3 className="text-sm font-bold mb-1 flex items-center justify-between">
              <span>Feuille d'appel (Cliquer pour marquer Absent)</span>
              <span className="text-xs text-muted">{students.length} Étudiants attendus</span>
            </h3>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-1 max-h-40 overflow-y-auto pr-0-5 p-0-5 bg-surface-bg rounded-lg">
              {students.map(stu => {
                const isSelected = newSession.attendance[stu.id]?.is_present;
                return (
                  <div key={stu.id} className="flex flex-col gap-0-5">
                    <div 
                      className={`cursor-pointer border-2 p-1 rounded-xl transition-all flex flex-col items-center text-center ${isSelected ? 'border-success bg-white shadow-sm' : 'border-error bg-error bg-opacity-5'}`}
                      onClick={() => toggleAttendance(stu.id)}
                    >
                      <div className={`w-3 h-3 rounded-full flex items-center justify-center text-white font-bold mb-0-5 ${isSelected ? 'bg-success' : 'bg-error'}`}>
                        {stu.first_name?.[0] || '?'}{stu.last_name?.[0] || ''}
                      </div>
                      <span className="text-sm font-bold leading-tight">{(stu.first_name || '') + ' ' + (stu.last_name || '') || 'Étudiant sans nom'}</span>
                      <div className="mt-0-5">
                        {isSelected ? (
                          <div className="flex items-center gap-0-5 text-success text-xs font-bold"><UserCheck size={14}/> Présent</div>
                        ) : (
                          <div className="flex items-center gap-0-5 text-error text-xs font-bold"><XCircle size={14}/> Absent</div>
                        )}
                      </div>
                    </div>
                    {!isSelected && (
                      <input 
                        type="text" 
                        placeholder="Justification..." 
                        className="input text-xs p-0-5 mt-0-2"
                        value={newSession.attendance[stu.id]?.justification || ''}
                        onChange={(e) => updateJustification(stu.id, e.target.value)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-1 mt-1 pt-1 border-t">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn bg-glass flex-1">Fermer</button>
            <button type="submit" className="btn btn-primary flex-1 shadow-lg">Valider la Séance et Présences</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
