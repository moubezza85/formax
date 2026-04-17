import React, { useState, useEffect } from 'react';
import { userService } from '../services/api';
import { Search, UserPlus, Filter, Edit2, Trash2, Printer, BarChart } from 'lucide-react';
import Modal from '../components/Modal';
import UserForm from '../components/forms/UserForm';

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => { fetchStudents(); }, []);

  const fetchStudents = async () => {
    try {
      const data = await userService.getStudents();
      setStudents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => { setSelectedStudent(null); setIsModalOpen(true); };
  const handleEdit = (s) => { setSelectedStudent(s); setIsModalOpen(true); };

  const handleDelete = async (userId) => {
    if (window.confirm('Voulez-vous vraiment supprimer cet étudiant ?')) {
      await userService.deleteUser(userId);
      fetchStudents();
    }
  };

  // helper: accès unifié que la réponse soit imbriquée (StudentOut) ou plate
  const u = (s) => s.user || s;

  const filteredStudents = students.filter(s => {
    const usr = u(s);
    const fullName = `${usr.first_name ?? ''} ${usr.last_name ?? ''}`.toLowerCase();
    const email = (usr.email ?? '').toLowerCase();
    const specialty = (s.specialty ?? '').toLowerCase();
    return fullName.includes(searchTerm.toLowerCase())
      || email.includes(searchTerm.toLowerCase())
      || specialty.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="fade-in">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-2xl font-bold">Gestion des Étudiants</h1>
          <p className="text-muted">Consultez et gérez les inscriptions des étudiants.</p>
        </div>
        <button className="btn btn-primary" onClick={handleCreate}>
          <UserPlus size={18} /> Ajouter un Étudiant
        </button>
      </div>

      <div className="card mb-2">
        <div className="flex gap-1 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-1 top-1 text-muted" size={18} />
            <input
              type="text"
              className="input pl-3 mb-0"
              placeholder="Rechercher par nom, email ou spécialité..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="btn btn-secondary bg-glass">
            <Filter size={18} /> Filtres
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card p-2 text-center text-muted">Chargement...</div>
      ) : filteredStudents.length === 0 ? (
        <div className="card p-2 text-center text-muted">Aucun étudiant trouvé.</div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-glass text-muted text-sm uppercase">
              <tr>
                <th className="p-1">#</th>
                <th className="p-1">Nom Complet</th>
                <th className="p-1">Email</th>
                <th className="p-1">Téléphone</th>
                <th className="p-1">Tél. Parent</th>
                <th className="p-1">Spécialité</th>
                <th className="p-1">Date d'ajout</th>
                <th className="p-1 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student, idx) => {
                const usr = u(student);
                const addedAt = student.added_at || student.created_at || usr.created_at;
                return (
                  <tr key={student.id} className="border-t border-surface-border hover:bg-glass">
                    <td className="p-1 text-muted text-sm">{idx + 1}</td>
                    <td className="p-1 font-bold">{usr.first_name} {usr.last_name}</td>
                    <td className="p-1">{usr.email}</td>
                    <td className="p-1">{usr.phone || <span className="text-muted">—</span>}</td>
                    <td className="p-1">{student.parent_phone || <span className="text-muted">—</span>}</td>
                    <td className="p-1">
                      {student.specialty
                        ? <span className="badge badge-secondary text-xs">{student.specialty}</span>
                        : <span className="text-muted">—</span>}
                    </td>
                    <td className="p-1 text-sm">
                      {addedAt ? new Date(addedAt).toLocaleDateString('fr-FR') : '—'}
                    </td>
                    <td className="p-1">
                      <div className="flex justify-center gap-0-5">
                        <button
                          onClick={() => window.location.href = `/reports/student/${student.id}`}
                          className="btn-icon text-secondary"
                          title="Rapport Financier"
                        >
                          <BarChart size={16} />
                        </button>
                        <button onClick={() => handleEdit(student)} className="btn-icon text-primary" title="Modifier">
                          <Edit2 size={16} />
                        </button>
                        <button className="btn-icon text-success" title="Imprimer">
                          <Printer size={16} />
                        </button>
                        <button onClick={() => handleDelete(usr.id || student.id)} className="btn-icon text-error" title="Supprimer">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedStudent ? "Modifier l'Étudiant" : "Créer un Étudiant"}
      >
        <UserForm
          user={selectedStudent}
          role="STUDENT"
          onSuccess={() => { setIsModalOpen(false); fetchStudents(); }}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
