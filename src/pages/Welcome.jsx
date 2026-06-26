import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { ArrowRight } from 'lucide-react';

export function Welcome() {
  const navigate = useNavigate();
  const perfil = useLiveQuery(() => db.perfil.get(1).then(p => p || null));

  useEffect(() => {
    if (perfil?.nome && perfil?.dataInicioPlano) {
      navigate('/home');
    }
  }, [perfil, navigate]);

  if (perfil === undefined) return <div className="p-4 text-center">Carregando...</div>;

  return (
    <div className="flex-1 bg-white dark:bg-gray-900 flex flex-col justify-between p-8 transition-colors duration-300">
      <div className="flex-1 flex flex-col items-center justify-center mt-12">
        <img src="/logo.png" alt="MaisKM Logo" className="h-32 w-auto mb-10 drop-shadow-md rounded-2xl shadow-sm transition-all duration-300" />
        
        <div className="text-center space-y-6">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100 leading-[1.1]">
            O Seu Treinador <br /> de Bolso.
          </h1>
          
          <div className="bg-orange-50 dark:bg-orange-900/30 text-[var(--color-primary)] font-bold text-[10px] sm:text-xs px-4 py-2 rounded-full inline-block uppercase tracking-wider mb-2 border border-orange-100 dark:border-orange-500/30">
            Baseado na Ciência do Esporte
          </div>
          <p className="text-[17px] text-gray-500 dark:text-gray-400 font-medium leading-relaxed max-w-xs mx-auto">
            Treine com as técnicas dos <strong>Melhores Treinadores do Mundo</strong>. Planos que se adaptam a você, com GPS e Voice Coach inteligente.
          </p>
        </div>
      </div>
      
      <div className="pb-8 pt-12">
        <button 
          onClick={() => navigate('/onboarding')}
          className="w-full bg-[var(--color-primary)] text-white font-bold py-4 px-6 rounded-2xl shadow-xl shadow-orange-500/30 flex items-center justify-between active:scale-95 transition-transform"
        >
          <span className="text-lg">Começar Agora</span>
          <ArrowRight size={24} />
        </button>
      </div>
    </div>
  );
}
