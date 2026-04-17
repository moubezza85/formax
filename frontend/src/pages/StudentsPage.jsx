import React, { useState, useEffect } from 'react';
import { userService } from '../services/api';
import { Search, UserPlus, Filter, Edit2, Trash2, Printer } from 'lucide-react';
import Modal from '../components/Modal';
import UserForm from '../components/forms/UserForm';

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => {
    fetchStudents();
  }, []);

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

  const handleCreate = () => {
    setSelectedStudent(null);
    setIsModalOpen(true);
  };

  const handleEdit = (student) => {
    setSelectedStudent(student);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Voulez-vous vraiment supprimer cet étudiant ?')) {
      await userService.deleteUser(id);
      fetchStudents();
    }
  };

  const filteredStudents = students.filter(s => 
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
              placeholder="Rechercher par nom ou email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="btn btn-secondary bg-glass">
            <Filter size={18} /> Filtres
          </button>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-glass text-muted text-sm uppercase">
            <tr>
              <th className="p-1">Nom Complet</th>
              <th className="p-1">Email</th>
              <th className="p-1">Téléphone</th>
              <th className="p-1">Date d'inscription</th>
              <th className="p-1 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map(student => (
              <tr key={student.id} className="border-t border-surface-border hover:bg-glass">
                <td className="p-1 font-bold">{student.first_name} {student.last_name}</td>
                <td className="p-1">{student.email}</td>
                <td className="p-1">{student.phone || 'N/A'}</td>
                <td className="p-1 text-sm">{new Date(student.created_at).toLocaleDateString()}</td>
                <td className="p-1">
                  <div className="flex justify-center gap-0-5">
                    <button onClick={() => handleEdit(student)} className="btn-icon text-primary"><Edit2 size={16} /></button>
                    <button className="btn-icon text-success"><Printer size={16} /></button>
                    <button onClick={() => handleDelete(student.id)} className="btn-icon text-error"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
