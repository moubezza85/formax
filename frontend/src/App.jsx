import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import AdminDashboard from './pages/AdminDashboard';
import LoginPage from './pages/LoginPage';
import StudentsPage from './pages/StudentsPage';
import TrainersPage from './pages/TrainersPage';
import TrainingsPage from './pages/TrainingsPage';
import PaymentsPage from './pages/PaymentsPage';
import LaunchTrainingPage from './pages/LaunchTrainingPage';
import ActiveTrainingsPage from './pages/ActiveTrainingsPage';
import SessionDetailsPage from './pages/SessionDetailsPage';
import PacksPage from './pages/PacksPage';
import StudentDebtPage from './pages/StudentDebtPage';
import TrainerEarningsPage from './pages/TrainerEarningsPage';

import ReportsPage from './pages/reports/ReportsPage';
import TrainingReportPage from './pages/reports/TrainingReportPage';
import StudentReportPage from './pages/reports/StudentReportPage';
import TrainerReportPage from './pages/reports/TrainerReportPage';
import PackReportPage from './pages/reports/PackReportPage';

import EnrollmentsPage from './pages/EnrollmentsPage';
import RoomPlanningPage from './pages/RoomPlanningPage';
import CertificatePage from './pages/CertificatePage';

function ProtectedLayout({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div>Chargement...</div>;
  if (!user) return <Navigate to="/login" />;
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<ProtectedLayout><AdminDashboard /></ProtectedLayout>} />
          <Route path="/users/students" element={<ProtectedLayout><StudentsPage /></ProtectedLayout>} />
          <Route path="/trainers" element={<ProtectedLayout><TrainersPage /></ProtectedLayout>} />
          <Route path="/formations/catalog" element={<ProtectedLayout><TrainingsPage /></ProtectedLayout>} />
          <Route path="/formations/launch" element={<ProtectedLayout><LaunchTrainingPage /></ProtectedLayout>} />
          <Route path="/formations/active" element={<ProtectedLayout><ActiveTrainingsPage /></ProtectedLayout>} />
          <Route path="/formations/packs" element={<ProtectedLayout><PacksPage /></ProtectedLayout>} />
          <Route path="/enrollments" element={<ProtectedLayout><EnrollmentsPage /></ProtectedLayout>} />
          <Route path="/planning/rooms" element={<ProtectedLayout><RoomPlanningPage /></ProtectedLayout>} />
          <Route path="/certificate/:id" element={<ProtectedLayout><CertificatePage /></ProtectedLayout>} />
          <Route path="/formations/sessions/:id" element={<ProtectedLayout><SessionDetailsPage /></ProtectedLayout>} />
          <Route path="/payments" element={<ProtectedLayout><PaymentsPage /></ProtectedLayout>} />
          <Route path="/reports" element={<ProtectedLayout><ReportsPage /></ProtectedLayout>} />
          <Route path="/reports/student-debt" element={<ProtectedLayout><StudentDebtPage /></ProtectedLayout>} />
          <Route path="/reports/trainer-earnings" element={<ProtectedLayout><TrainerEarningsPage /></ProtectedLayout>} />
          <Route path="/reports/training/:id" element={<ProtectedLayout><TrainingReportPage /></ProtectedLayout>} />
          <Route path="/reports/formation/:id" element={<ProtectedLayout><TrainingReportPage /></ProtectedLayout>} />
          <Route path="/reports/student/:id" element={<ProtectedLayout><StudentReportPage /></ProtectedLayout>} />
          <Route path="/reports/trainer/:id" element={<ProtectedLayout><TrainerReportPage /></ProtectedLayout>} />
          <Route path="/reports/pack/:id" element={<ProtectedLayout><PackReportPage /></ProtectedLayout>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
