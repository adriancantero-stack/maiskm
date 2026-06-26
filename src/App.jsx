import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Home, Dumbbell, History, User, Map } from 'lucide-react';
import { Onboarding } from './pages/Onboarding';
import { Welcome } from './pages/Welcome';
import { HomePage } from './pages/Home';
import { TrainingPage } from './pages/Training';
import { HistoryPage } from './pages/History';
import { ProfilePage } from './pages/Profile';
import { StrengthTrainingPage } from './pages/StrengthTraining';
import { JourneyPage } from './pages/Journey';
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-10 text-red-500 bg-white">
          <h1 className="text-xl font-bold">Erro de Renderização:</h1>
          <p>{this.state.error.message}</p>
          <pre className="text-xs mt-4 overflow-auto">{this.state.error.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function Layout() {
  const location = useLocation();
  const isTraining = location.pathname === '/training' || location.pathname === '/strength';

  // Na tela de treino ativo, podemos querer ocultar o menu inferior
  return (
    <div className="flex flex-col flex-1 bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100 transition-colors duration-300">
      <div className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/home" element={<HomePage />} />
          <Route path="/training" element={<TrainingPage />} />
          <Route path="/strength" element={<StrengthTrainingPage />} />
          <Route path="/journey" element={<JourneyPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/home" />} />
        </Routes>
      </div>

      {!isTraining && (
        <nav className="bg-white border-t border-gray-200 dark:bg-gray-800 dark:border-gray-800 pb-safe transition-colors duration-300">
          <div className="flex justify-around items-center h-16">
            <Link to="/home" className={`flex flex-col items-center flex-1 py-2 ${location.pathname === '/home' ? 'text-[var(--color-primary)]' : 'text-gray-400 dark:text-gray-500'}`}>
              <Home size={24} />
              <span className="text-[10px] mt-1 font-medium">Hoje</span>
            </Link>
            <Link to="/journey" className={`flex flex-col items-center flex-1 py-2 ${location.pathname === '/journey' ? 'text-[var(--color-primary)]' : 'text-gray-400 dark:text-gray-500'}`}>
              <Map size={24} />
              <span className="text-[10px] mt-1 font-medium">Mapa</span>
            </Link>
            <Link to="/history" className={`flex flex-col items-center flex-1 py-2 ${location.pathname === '/history' ? 'text-[var(--color-primary)]' : 'text-gray-400 dark:text-gray-500'}`}>
              <History size={24} />
              <span className="text-[10px] mt-1 font-medium">Histórico</span>
            </Link>
            <Link to="/profile" className={`flex flex-col items-center flex-1 py-2 ${location.pathname === '/profile' ? 'text-[var(--color-primary)]' : 'text-gray-400 dark:text-gray-500'}`}>
              <User size={24} />
              <span className="text-[10px] mt-1 font-medium">Perfil</span>
            </Link>
          </div>
        </nav>
      )}
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-gray-200 dark:bg-black flex justify-center transition-colors duration-300">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl overflow-hidden flex flex-col min-h-screen relative transition-colors duration-300">
        <ErrorBoundary>
          <Router>
            <Routes>
              <Route path="/" element={<Navigate to="/welcome" />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/welcome" element={<Welcome />} />
              
              {/* Rotas com o Menu Inferior */}
              <Route path="/*" element={<Layout />} />
            </Routes>
          </Router>
        </ErrorBoundary>
      </div>
    </div>
  );
}
