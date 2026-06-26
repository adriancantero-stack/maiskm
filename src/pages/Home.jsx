import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Info, X } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import planosData from '../data/trainingPlans.json';

export function HomePage() {
  const navigate = useNavigate();
  const [showMethodModal, setShowMethodModal] = useState(false);
  const perfil = useLiveQuery(() => db.perfil.get(1).then(p => p || null));

  if (perfil === undefined) return <div className="p-4 text-center mt-10">Carregando...</div>;
  if (perfil === null) {
    navigate('/');
    return null;
  }

  // Calcula dias desde o início
  const dataInicio = new Date(perfil.dataInicioPlano);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  dataInicio.setHours(0, 0, 0, 0);
  
  const diffTime = Math.abs(hoje - dataInicio);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  const semanaAtual = Math.floor(diffDays / 7) + 1;
  const diaAtual = diffDays % 7;

  // Busca no plano
  const plano = planosData[perfil.distanciaAlvo]?.[perfil.nivel] || planosData["5km"]["iniciante"]; // Fallback seguro
  const semanaData = plano.semanas.find(s => s.semana === semanaAtual) || plano.semanas[0];
  const treinoHoje = semanaData.dias.find(d => d.dia === diaAtual) || semanaData.dias[0];

  const iniciarTreino = () => {
    if (treinoHoje.tipo === 'forca') {
      navigate('/strength', { state: { treino: treinoHoje } });
    } else {
      navigate('/training', { state: { treino: treinoHoje } });
    }
  };

  const isDescanso = treinoHoje.tipo === 'descanso';

  return (
    <div className="p-6 transition-colors duration-300">
      <header className="mb-8 mt-4 flex items-center justify-between">
        <div>
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Bom dia,</p>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{perfil.nome || 'Corredor'}!</h1>
        </div>
        <img src="/logo.png" alt="MaisKM Logo" className="h-10 w-auto rounded-xl shadow-sm transition-all duration-300" />
      </header>

      <section className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-6 relative overflow-hidden transition-colors duration-300">
        {isDescanso && (
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-400"></div>
        )}
        {!isDescanso && (
          <div className="absolute top-0 left-0 w-1 h-full bg-[var(--color-primary)]"></div>
        )}

        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className={`font-bold text-sm uppercase tracking-wider mb-1 ${isDescanso ? 'text-blue-500' : 'text-[var(--color-primary)]'}`}>
              Treino de Hoje
            </h2>
            <h3 className="text-xl font-bold dark:text-gray-100">{treinoHoje.titulo}</h3>
          </div>
          {treinoHoje.tempo > 0 && (
            <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 font-bold px-3 py-1 rounded-full text-sm">
              {treinoHoje.tempo} min
            </span>
          )}
        </div>
        
        <p className="text-gray-600 dark:text-gray-300 text-sm mb-6">{treinoHoje.descricao}</p>
        
        {!isDescanso && (
          <button 
            onClick={iniciarTreino}
            className="w-full bg-[var(--color-primary)] text-white rounded-xl py-4 font-bold flex items-center justify-center space-x-2 shadow-lg active:scale-95 transition-transform"
          >
            <Play fill="white" size={20} />
            <span>INICIAR TREINO</span>
          </button>
        )}
      </section>

      <section>
        <div className="mb-4">
          <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">
            Semana {semanaAtual} do Plano: {perfil.distanciaAlvo.toUpperCase()}
          </h3>
          <button 
            onClick={() => setShowMethodModal(true)}
            className="flex items-center space-x-1.5 text-sm text-[var(--color-primary)] font-medium mt-1 hover:opacity-80 transition-opacity text-left"
          >
            <span>Método: {plano.metodologia}</span>
            <Info size={16} className="animate-pulse flex-shrink-0" />
          </button>
        </div>
        <div className="space-y-3">
          {semanaData.dias.map((diaInfo, idx) => {
            const isPast = diaInfo.dia < diaAtual;
            const isToday = diaInfo.dia === diaAtual;
            
            // Renderização simplificada dos dias da semana
            const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
            const dateCalc = new Date(dataInicio);
            dateCalc.setDate(dataInicio.getDate() + (semanaAtual - 1) * 7 + diaInfo.dia);
            const diaSemanaNome = diasSemana[dateCalc.getDay()];

            return (
              <div 
                key={diaInfo.dia}
                className={`p-4 rounded-xl flex items-center justify-between border transition-colors duration-300 ${
                  isToday ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-500/30' : 
                  isPast ? 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 opacity-60' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'
                }`}
              >
                <div>
                  <p className={`font-bold ${isToday ? 'text-[var(--color-primary)]' : 'text-gray-800 dark:text-gray-200'}`}>
                    {diaSemanaNome} {isToday && '(Hoje)'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {diaInfo.titulo} {diaInfo.tempo > 0 ? `- ${diaInfo.tempo}min` : ''}
                  </p>
                </div>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  isPast ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
                  isToday && !isDescanso ? 'border-2 border-[var(--color-primary)]' :
                  isToday && isDescanso ? 'border-2 border-blue-400' : ''
                }`}>
                  {isPast && '✓'}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Modal da Metodologia */}
      {showMethodModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            <div className="p-6 relative">
              <button 
                onClick={() => setShowMethodModal(false)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 bg-gray-50 dark:bg-gray-700 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
              
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mb-4">
                <Info size={24} className="text-[var(--color-primary)]" />
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                O Método {plano.metodologia.split(' ')[0]}
              </h3>
              
              <div className="text-sm text-gray-600 dark:text-gray-300 space-y-3 leading-relaxed">
                {perfil.nivel === 'iniciante' && (
                  <>
                    <p>Você está treinando com a técnica do atleta olímpico americano <strong>Jeff Galloway</strong>.</p>
                    <p>O método <strong>Run-Walk-Run</strong> prova que fazer pausas programadas de caminhada reduz a fadiga, previne lesões e faz você terminar a corrida se sentindo forte.</p>
                    <p>Não pule as caminhadas! Elas são parte vital da sua evolução.</p>
                  </>
                )}
                {perfil.nivel === 'intermediario' && (
                  <>
                    <p>Você está treinando com a técnica de <strong>Hal Higdon</strong>, um dos maiores treinadores de corrida do mundo.</p>
                    <p>Esta filosofia é focada em <strong>consistência</strong> e volume aeróbico. Seus treinos não devem ser exaustivos, eles devem ser confortáveis para construir resistência e te preparar para o Longão do fim de semana.</p>
                  </>
                )}
                {perfil.nivel === 'avancado' && (
                  <>
                    <p>Você está treinando com a ciência de <strong>Jack Daniels</strong> (Fórmula VDOT).</p>
                    <p>Considerado o "Melhor Treinador do Mundo" pela Runner's World, seu método divide o treino em zonas exatas de estímulo fisiológico (Limiar, VO2máx, Recovery) para quebrar seu recorde pessoal com precisão matemática.</p>
                  </>
                )}
              </div>
              
              <button 
                onClick={() => setShowMethodModal(false)}
                className="w-full mt-6 bg-[var(--color-primary)] text-white font-bold py-3 rounded-xl active:scale-95 transition-transform"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
