import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { Lock, Mail, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, user } = useAuth();

  if (user) return <Navigate to="/" />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
    } catch (err) {
      setError('Identifiants invalides. Veuillez réessayer.');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card card">
        <div className="logo text-center mb-2">Formax</div>
        <h2 className="text-center mb-1">Connexion</h2>
        <p className="text-center text-muted mb-2">Accédez à votre espace de gestion</p>
        
        {error && (
          <div className="alert alert-error flex items-center gap-0-5 mb-1">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="text-sm font-bold block">Email</label>
            <div className="relative">
              <Mail className="absolute left-1 top-1 text-muted" size={18} />
              <input 
                type="email" 
                className="input pl-3" 
                placeholder="votre@email.ma"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
              />
            </div>
          </div>
          
          <div className="form-group">
            <label className="text-sm font-bold block">Mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-1 top-1 text-muted" size={18} />
              <input 
                type="password" 
                className="input pl-3" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary w-full">
            Se connecter
          </button>
        </form>
      </div>
    </div>
  );
}
