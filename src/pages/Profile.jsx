import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { Moon, Sun } from 'lucide-react';

export function ProfilePage() {
  const perfil = useLiveQuery(() => db.perfil.get(1).then(p => p || null));
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  const resetData = async () => {
    if (confirm("Isso apagará todo seu histórico. Tem certeza?")) {
      await db.sessoes.clear();
      await db.perfil.clear();
      navigate('/');
    }
  };

  const toggleVoz = async () => {
    if (perfil) {
      await db.perfil.update(1, { vozAtivada: !perfil.vozAtivada });
    }
  };

  if (perfil === undefined) return <div className="p-4 text-center mt-10">Carregando...</div>;
  if (perfil === null) return null;

  return (
    <div className="p-6 transition-colors duration-300">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Seu Perfil</h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-6 transition-colors duration-300">
        <h2 className="font-bold text-lg mb-4 text-[var(--color-primary)]">Informações Pessoais</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wide">Nome</p>
            <p className="font-medium text-gray-900 dark:text-gray-100">{perfil.nome}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wide">Alvo</p>
            <p className="font-medium text-gray-900 dark:text-gray-100">{perfil.distanciaAlvo}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wide">Nível</p>
            <p className="font-medium text-gray-900 dark:text-gray-100 capitalize">{perfil.nivel}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wide">Peso</p>
            <p className="font-medium text-gray-900 dark:text-gray-100">{perfil.peso} kg</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-6 transition-colors duration-300">
        <h2 className="font-bold text-lg mb-4 text-gray-800 dark:text-gray-100">Preferências</h2>
        
        {/* Modo Escuro Toggle */}
        <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            {isDark ? <Moon size={20} className="text-blue-400" /> : <Sun size={20} className="text-orange-400" />}
            <span className="font-medium text-gray-700 dark:text-gray-200">Modo Escuro</span>
          </div>
          <div 
            onClick={toggleTheme}
            className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${isDark ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}
          >
            <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${isDark ? 'translate-x-6' : ''}`}></div>
          </div>
        </div>

        <div className="flex items-center justify-between py-3">
          <span className="font-medium text-gray-700 dark:text-gray-200">Treinador por Voz</span>
          <div 
            onClick={toggleVoz}
            className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${perfil.vozAtivada ? 'bg-[var(--color-primary)]' : 'bg-gray-300'}`}
          >
            <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${perfil.vozAtivada ? 'translate-x-6' : ''}`}></div>
          </div>
        </div>
      </div>

      <button onClick={resetData} className="w-full mt-4 py-4 rounded-xl border-2 border-red-100 text-red-500 font-bold active:bg-red-50 transition-colors">
        Apagar Dados e Reiniciar
      </button>

      <div className="mt-8 mb-4 text-center">
        <p className="text-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wider">
          Desenvolvido por <span className="text-[var(--color-primary)] font-bold">CanteroLabs</span>
        </p>
      </div>
    </div>
  );
}
