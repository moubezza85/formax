import React from 'react';
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
  Wallet
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const { logout, user } = useAuth();

  const menuItems = [
    { path: '/', name: 'Tableau de bord', icon: LayoutDashboard },
    { path: '/users/students', name: 'Étudiants', icon: Users },
    { path: '/trainers', name: 'Formateurs', icon: GraduationCap },
    { path: '/formations/catalog', name: 'Catalogue', icon: BookOpen },
    { path: '/formations/packs', name: 'Packs Promo', icon: Package },
    { path: '/formations/launch', name: 'Lancer Formation', icon: PlayCircle },
    { path: '/formations/active', name: 'Formations Lancées', icon: Activity },
    { path: '/reports/student-debt', name: 'Dettes Étudiants', icon: AlertCircle },
    { path: '/reports/trainer-earnings', name: 'Gains Formateurs', icon: Wallet },
    { path: '/payments', name: 'Paiements', icon: CreditCard },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo">Formax</div>
      </div>
      
      <nav className="sidebar-nav">
        {menuItems.map(item => (
          <NavLink 
            key={item.path} 
            to={item.path} 
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <item.icon size={20} />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <UserCircle size={32} />
          <div className="user-details">
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
