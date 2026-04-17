import React, { useState, useEffect } from 'react';
import { enrollmentService } from '../services/api';
import { Search, Filter, BookOpen, User, Tag, Calendar, CheckCircle, Clock, AlertCircle, Download } from 'lucide-react';

export default function EnrollmentsPage() {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchEnrollments();
  }, [statusFilter]);

  const fetchEnrollments = async () => {
    try {
      const data = await enrollmentService.listAll({ status: statusFilter });
      setEnrollments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await enrollmentService.updateStatus(id, newStatus);
      fetchEnrollments();
    } catch (err) {
      alert('Erreur lors de la mise à jour du statut');
    }
  };

  const handleExportCSV = () => {
    const headers = ["Date", "Étudiant", "Formation/Pack", "Prix Final", "Mode", "Statut"];
    const rows = filteredEnrollments.map(e => [
      new Date(e.created_at).toLocaleDateString(),
      `${e.student?.user?.first_name} ${e.student?.user?.last_name}`,
      e.training?.title || e.pack?.name,
      e.final_price,
      e.payment_mode,
      e.status
    ]);

    let csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(r => r.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `inscriptions_formax_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredEnrollments = enrollments.filter(e => {
    const studentName = `${e.student?.user?.first_name} ${e.student?.user?.last_name}`.toLowerCase();
    const trainingTitle = (e.training?.title || e.pack?.name || '').toLowerCase();
    return studentName.includes(searchTerm.toLowerCase()) || trainingTitle.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="fade-in">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-2xl font-bold">Gestion des Inscriptions</h1>
          <p className="text-muted">Suivez toutes les souscriptions aux formations et packs.</p>
        </div>
        <button className="btn bg-glass border flex subtitle-center gap-0-5" onClick={handleExportCSV}>
            <Download size={18} /> Export CSV
        </button>
      </div>

      <div className="card mb-2">
        <div className="flex gap-1 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-1 top-1 text-muted" size={18} />
            <input 
              type="text" 
              className="input pl-3 mb-0" 
              placeholder="Rechercher par étudiant ou formation..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-0-5">
            <Filter size={18} className="text-muted" />
            <select 
              className="input mb-0 py-0-5" 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Tous les statuts</option>
              <option value="active">Actif</option>
              <option value="completed">Terminé</option>
              <option value="cancelled">Annulé</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
            <div className="p-3 text-center text-muted">Chargement des inscriptions...</div>
        ) : (
            <table className="w-full text-left">
                <thead className="bg-glass text-muted text-sm uppercase">
                    <tr>
                        <th className="p-1">Date</th>
                        <th className="p-1">Étudiant</th>
                        <th className="p-1">Formation / Pack</th>
                        <th className="p-1 text-right">Prix Final</th>
                        <th className="p-1">Mode Paiement</th>
                        <th className="p-1">Statut</th>
                        <th className="p-1 text-center">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredEnrollments.map(e => (
                        <tr key={e.id} className="border-t border-surface-border hover:bg-glass">
                            <td className="p-1 text-sm whitespace-nowrap">
                                <span className="flex items-center gap-0-5">
                                    <Calendar size={14} className="text-muted" />
                                    {new Date(e.created_at).toLocaleDateString()}
                                </span>
                            </td>
                            <td className="p-1">
                                <div className="font-bold flex items-center gap-0-5">
                                    <User size={16} className="text-primary" />
                                    {e.student?.user?.first_name} {e.student?.user?.last_name}
                                </div>
                            </td>
                            <td className="p-1">
                                <div className="flex items-center gap-0-5">
                                    <BookOpen size={16} className="text-secondary" />
                                    {e.training?.title || e.pack?.name}
                                    {e.pack && <span className="tag tag-success text-xs py-0 px-0-5">Pack</span>}
                                </div>
                            </td>
                            <td className="p-1 text-right font-bold text-primary">
                                {e.final_price?.toLocaleString()} MAD
                            </td>
                            <td className="p-1">
                                <div className="text-xs uppercase font-bold text-muted bg-glass px-0-5 py-0-2 rounded inline-block">
                                    {e.payment_mode}
                                </div>
                            </td>
                            <td className="p-1">
                                <span className={`tag ${e.status === 'active' ? 'tag-success' : e.status === 'completed' ? 'bg-secondary text-white' : 'bg-glass text-muted'}`}>
                                    {e.status}
                                </span>
                            </td>
                            <td className="p-1 text-center">
                                <div className="flex justify-center gap-0-5">
                                    <select 
                                        className="text-xs border rounded p-0-2 bg-glass"
                                        value={e.status}
                                        onChange={(event) => handleStatusChange(e.id, event.target.value)}
                                    >
                                        <option value="active">Activer</option>
                                        <option value="completed">Terminer</option>
                                        <option value="cancelled">Annuler</option>
                                    </select>
                                    {e.status === 'completed' && (
                                        <button 
                                            onClick={() => window.location.href = `/certificate/${e.id}`}
                                            className="btn-icon text-secondary"
                                            title="Générer Certificat"
                                        >
                                            <Award size={16} />
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => window.location.href = `/reports/student/${e.student_id}`}
                                        className="btn-icon text-muted"
                                        title="Voir profil financier"
                                    >
                                        <AlertCircle size={16} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {filteredEnrollments.length === 0 && (
                        <tr><td colSpan="7" className="p-3 text-center text-muted">Aucune inscription trouvée.</td></tr>
                    )}
                </tbody>
            </table>
        )}
      </div>

      <div className="grid grid-3 gap-1-5 mt-2">
         <div className="card bg-glass flex items-center gap-1">
            <div className="p-1 rounded bg-white text-primary">
                <BookOpen size={24} />
            </div>
            <div>
                <p className="text-xs font-bold text-muted uppercase">Total Inscriptions</p>
                <h3 className="text-xl font-bold">{enrollments.length}</h3>
            </div>
         </div>
         <div className="card bg-glass flex items-center gap-1">
            <div className="p-1 rounded bg-white text-success">
                <CheckCircle size={24} />
            </div>
            <div>
                <p className="text-xs font-bold text-muted uppercase">Actives</p>
                <h3 className="text-xl font-bold">{enrollments.filter(e => e.status === 'active').length}</h3>
            </div>
         </div>
         <div className="card bg-glass flex items-center gap-1">
            <div className="p-1 rounded bg-white text-secondary">
                <Tag size={24} />
            </div>
            <div>
                <p className="text-xs font-bold text-muted uppercase">Paiements Mensuels</p>
                <h3 className="text-xl font-bold">{enrollments.filter(e => e.payment_mode === 'monthly').length}</h3>
            </div>
         </div>
      </div>
    </div>
  );
}
