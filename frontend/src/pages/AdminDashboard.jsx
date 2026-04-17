import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3, TrendingUp, Users, BookOpen,
  AlertTriangle, ArrowRight, Plus, Wallet,
  GraduationCap, Package
} from 'lucide-react';
import { reportService } from '../services/api';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState({
    revenue: 0, profit: 0, studentCount: 0, trainingCount: 0, debtors: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportService.getDashboardStats()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    {
      label: 'Revenu Total',
      value: `${(data.revenue || 0).toLocaleString()} MAD`,
      icon: TrendingUp,
      color: 'text-success',
      link: '/reports'
    },
    {
      label: 'Étudiants Actifs',
      value: (data.studentCount || 0).toString(),
      icon: Users,
      color: 'text-primary',
      link: '/users/students'
    },
    {
      label: 'Formations Actives',
      value: (data.trainingCount || 0).toString(),
      icon: BookOpen,
      color: 'text-secondary',
      link: '/formations/active'
    },
    {
      label: 'Profit Net',
      value: `${(data.profit || 0).toLocaleString()} MAD`,
      icon: BarChart3,
      color: 'text-warning',
      link: '/reports'
    },
  ];

  const quickActions = [
    { label: 'Lancer une Formation', icon: Plus, path: '/formations/launch', color: 'btn-primary' },
    { label: 'Ajouter un Étudiant', icon: Users, path: '/users/students', color: 'btn-secondary' },
    { label: 'Ajouter un Formateur', icon: GraduationCap, path: '/trainers', color: 'btn-secondary' },
    { label: 'Gérer les Packs', icon: Package, path: '/formations/packs', color: 'btn-secondary' },
    { label: 'Voir les Paiements', icon: Wallet, path: '/payments', color: 'btn-secondary' },
  ];

  if (loading) {
    return (
      <div className="container p-0 fade-in">
        <div className="dashboard-grid mb-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card" style={{ height: 80 }}>
              <div className="skeleton" style={{ height: '100%', borderRadius: 8 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container p-0 fade-in">
      <header className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-2xl font-bold">Tableau de Bord</h1>
          <p className="text-muted">Vue d'ensemble de la performance de Formax.</p>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="dashboard-grid mb-2">
        {stats.map((stat, i) => (
          <div
            key={i}
            className="card flex items-center gap-1 cursor-pointer"
            style={{ transition: 'box-shadow 0.18s' }}
            onClick={() => navigate(stat.link)}
            title={`Voir ${stat.label}`}
          >
            <div className={`p-1 rounded-lg bg-glass ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted">{stat.label}</p>
              <h3 className="text-xl font-bold">{stat.value}</h3>
            </div>
            <ArrowRight size={16} className="text-muted" />
          </div>
        ))}
      </div>

      <div className="flex gap-1 items-start mb-2">
        {/* Alertes solde */}
        <div className="flex-1">
          <h2 className="mb-1">Alertes de Solde</h2>
          <div className="card border-error">
            {data.debtors.length === 0 ? (
              <p className="text-center text-muted p-1">Aucune alerte en cours. ✅</p>
            ) : (
              data.debtors.map((debtor, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center p-0-5 border-b border-surface-border last:border-0 cursor-pointer"
                  onClick={() => navigate('/reports/student-debt')}
                >
                  <div className="flex items-center gap-1">
                    <AlertTriangle size={18} className="text-error" />
                    <div>
                      <div className="font-bold">{debtor.student_name}</div>
                      <div className="text-xs text-muted">
                        Solde restant : {(debtor.remaining_balance || 0).toLocaleString()} MAD
                      </div>
                    </div>
                  </div>
                  <ArrowRight size={18} className="text-muted" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Actions rapides */}
        <div className="flex-1">
          <h2 className="mb-1">Actions Rapides</h2>
          <div className="card flex flex-col gap-0-5">
            {quickActions.map((action, i) => (
              <button
                key={i}
                className={`btn ${action.color} flex items-center gap-1 w-full justify-start`}
                onClick={() => navigate(action.path)}
              >
                <action.icon size={16} />
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Lancement */}
      <div className="card bg-primary text-white p-2 text-center">
        <h2 className="mb-1 text-white">Lancer une nouvelle Formation</h2>
        <p className="mb-2 opacity-90">
          Utilisez l'assistant de lancement pour configurer formations, étudiants, formateurs et paiements.
        </p>
        <button
          className="btn bg-white text-primary font-bold mx-auto inline-flex items-center gap-1"
          onClick={() => navigate('/formations/launch')}
        >
          <Plus size={18} /> Ouvrir l'Assistant de Lancement
        </button>
      </div>
    </div>
  );
}
