import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, BookOpen, AlertTriangle, ArrowRight, Plus } from 'lucide-react';
import { reportService, userService, trainingService } from '../services/api';

export default function AdminDashboard() {
  const [dashboardData, setDashboardData] = useState({
    revenue: 0,
    profit: 0,
    studentCount: 0,
    trainingCount: 0,
    debtors: [] // Students with high balance
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const rev = await reportService.getRevenue();
        const prof = await reportService.getProfit();
        const students = await userService.getStudents();
        const trainings = await trainingService.getTrainings();
        
        // Mocking debtor detection logic for demonstration
        const debtors = students.slice(0, 3).map(s => ({ ...s, balance: 1200 }));

        setDashboardData({
          revenue: rev.total_revenue,
          profit: prof.net_profit,
          studentCount: students.length,
          trainingCount: trainings.length,
          debtors: debtors
        });
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
      }
    };
    fetchData();
  }, []);

  const stats = [
    { label: 'Revenu Total', value: `${dashboardData.revenue.toLocaleString()} MAD`, icon: TrendingUp, color: 'text-success' },
    { label: 'Étudiants Actifs', value: dashboardData.studentCount.toString(), icon: Users, color: 'text-primary' },
    { label: 'Formations', value: dashboardData.trainingCount.toString(), icon: BookOpen, color: 'text-secondary' },
    { label: 'Profit Net', value: `${dashboardData.profit.toLocaleString()} MAD`, icon: BarChart3, color: 'text-warning' },
  ];

  return (
    <div className="container p-0 fade-in">
      <header className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-2xl font-bold">Tableau de Bord Admin</h1>
          <p className="text-muted">Vue d'ensemble de la performance de Formax.</p>
        </div>
      </header>

      <div className="dashboard-grid mb-2">
        {stats.map((stat, i) => (
          <div key={i} className="card flex items-center gap-1">
            <div className={`p-1 rounded-lg bg-glass ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-sm text-muted">{stat.label}</p>
              <h3 className="text-xl font-bold">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-1 items-start">
        <div className="flex-1">
          <h2 className="mb-1">Alertes de Solde</h2>
          <div className="card border-error">
            {dashboardData.debtors.map((debtor, i) => (
              <div key={i} className="flex justify-between items-center p-0-5 border-b border-surface-border last:border-0">
                <div className="flex items-center gap-1">
                  <div className="text-error"><AlertTriangle size={18} /></div>
                  <div>
                    <div className="font-bold">{debtor.first_name} {debtor.last_name}</div>
                    <div className="text-xs text-muted">Solde restant : {debtor.balance} MAD</div>
                  </div>
                </div>
                <button className="btn btn-icon text-muted"><ArrowRight size={18} /></button>
              </div>
            ))}
            {dashboardData.debtors.length === 0 && <p className="text-center text-muted p-1">Aucune alerte en cours.</p>}
          </div>
        </div>
        
        <div className="flex-1">
          <h2 className="mb-1">État des Sessions</h2>
          <div className="card">
            <div className="flex justify-between items-center mb-1">
              <span>Progrès des Formations</span>
              <span className="tag tag-success">85% Global</span>
            </div>
            <div className="h-0-5 w-full bg-glass rounded-lg overflow-hidden">
              <div className="h-full bg-primary" style={{ width: '85%' }}></div>
            </div>
            <p className="text-xs text-muted mt-1">12 sessions réalisées cette semaine sur 15 prévues.</p>
          </div>
        </div>
      </div>

      <div className="mt-2 text-center">
        <div className="card bg-primary text-white p-2">
          <h2 className="mb-1 text-white">Lancer une nouvelle Formation</h2>
          <p className="mb-2 opacity-90">Utilisez notre assistant intelligent pour configurer vos formations, étudiants et formateurs.</p>
          <a href="/formations/launch" className="btn bg-white text-primary font-bold mx-auto inline-flex">
            <Plus size={18} /> Ouvrir l'Assistant de Lancement
          </a>
        </div>
      </div>
    </div>
  );
}
