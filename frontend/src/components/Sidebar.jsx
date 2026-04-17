import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  CreditCard,
  LogOut,
  UserCircle,
  PlayCircle,
  Activity,
  Package,
  AlertCircle,
  Wallet,
  Tag,
  Calendar,
  BarChart2,
  FileText,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const menuGroups = [
  {
    label: null,
    items: [
      { path: '/', name: 'Tableau de bord', icon: LayoutDashboard, end: true },
    ]
  },
  {
    label: 'Utilisateurs',
    items: [
      { path: '/users/students', name: 'Étudiants', icon: Users },
      { path: '/trainers', name: 'Formateurs', icon: GraduationCap },
    ]
  },
  {
    label: 'Formations',
    items: [
      { path: '/formations/catalog', name: 'Catalogue', icon: BookOpen },
      { path: '/formations/packs', name: 'Packs Promo', icon: Package },
      { path: '/formations/launch', name: 'Lancer Formation', icon: PlayCircle },
      { path: '/formations/active', name: 'Formations Lancées', icon: Activity },
    ]
  },
  {
    label: 'Inscriptions & Planning',
    items: [
      { path: '/enrollments', name: 'Inscriptions', icon: Tag },
      { path: '/planning/rooms', name: 'Planning Salles', icon: Calendar },
    ]
  },
  {
    label: 'Finance',
    items: [
      { path: '/payments', name: 'Paiements', icon: CreditCard },
      { path: '/reports/student-debt', name: 'Dettes Étudiants', icon: AlertCircle },
      { path: '/reports/trainer-earnings', name: 'Gains Formateurs', icon: Wallet },
    ]
  },
  {
    label: 'Rapports',
    items: [
      { path: '/reports', name: 'Vue Générale', icon: BarChart2 },
      { path: '/reports/student-debt', name: 'Par Étudiant', icon: FileText },
      { path: '/reports/trainer-earnings', name: 'Par Formateur', icon: FileText },
    ]
  },
];

export default function Sidebar() {
  const { logout, user } = useAuth();
  const [collapsed, setCollapsed] = useState({});

  const toggleGroup = (label) => {
    setCollapsed(prev => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo">Formax</div>
      </div>

      <nav className="sidebar-nav">
        {menuGroups.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <button
                className="sidebar-group-header"
                onClick={() => toggleGroup(group.label)}
                style={{
                  width: '100%', background: 'none', border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.5rem 1rem 0.25rem',
                  fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em',
                  textTransform: 'uppercase', color: 'var(--color-text-faint)',
                  cursor: 'pointer'
                }}
              >
                <span>{group.label}</span>
                {collapsed[group.label]
                  ? <ChevronRight size={12} />
                  : <ChevronDown size={12} />}
              </button>
            )}

            {!collapsed[group.label] && group.items.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end || false}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                <item.icon size={18} />
                <span>{item.name}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <UserCircle size={32} />
          <div className="user-details">
            <span className="user-name">{user?.first_name} {user?.last_name}</span>
            <span className="user-role">{user?.role}</span>
          </div>
        </div>
        <button onClick={logout} className="logout-btn">
          <LogOut size={18} />
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  );
}
