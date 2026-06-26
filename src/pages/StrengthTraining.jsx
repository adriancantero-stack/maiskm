import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { formatTime } from '../utils/formatters';
import { CheckCircle2, Circle, Play, Square, Pause, X } from 'lucide-react';
import strengthData from '../data/strengthExercises.json';

export function StrengthTrainingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const treinoHoje = location.state?.treino || null;
  const perfil = useLiveQuery(() => db.perfil.get(1));

  const [local, setLocal] = useState('casa'); // 'casa' ou 'academia'
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timer, setTimer] = useState(0); // em segundos
  const [completedExercises, setCompletedExercises] = useState({});

  const exercicios = strengthData[local] || [];

  // Cronômetro simples (sem gps, sem wakelock complexo)
  useEffect(() => {
    let interval = null;
    if (isActive && !isPaused) {
      interval = setInterval(() => {
        setTimer(t => t + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, isPaused]);

  const toggleExercise = (index) => {
    setCompletedExercises(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const togglePause = () => {
    if (isActive && !isPaused) setIsPaused(true);
    else if (isActive && isPaused) setIsPaused(false);
    else setIsActive(true); // Start inicial
  };

  const finishTraining = async () => {
    setIsActive(false);
    setIsPaused(true);

    // Calcula calorias aproximadas para treino de força (ex: 5 kcal por minuto para peso de 70kg)
    const peso = perfil?.peso || 70;
    const caloriasPorMin = (peso * 0.07); // fator genérico de força
    const totalCalorias = Math.round((timer / 60) * caloriasPorMin);

    await db.sessoes.add({
      data: new Date(),
      duracao: timer,
      distancia: 0,
      paceMedio: 0,
      calorias: totalCalorias,
      splits: [],
      planoRef: `${perfil?.distanciaAlvo || ''} (Força)`,
    });

    navigate('/history');
  };

  const cancelTraining = () => {
    if (window.confirm("Deseja desistir deste treino? Ele não será salvo no histórico.")) {
      navigate('/home');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 flex flex-col pb-24">
      {/* Header */}
      <div className="bg-[var(--color-primary)] text-white p-6 pt-12 rounded-b-[2rem] shadow-md relative transition-colors duration-300">
        <button onClick={cancelTraining} className="absolute top-4 left-4 p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
          <X size={20} className="text-white" />
        </button>
        <h1 className="text-2xl font-black mb-1">{treinoHoje?.titulo || 'Treino de Força'}</h1>
        <p className="text-sm opacity-90">{treinoHoje?.descricao || 'Fortalecimento Muscular'}</p>
        
        {/* Timer Flutuante */}
        <div className="absolute -bottom-8 right-6 bg-gray-900 dark:bg-gray-800 text-white px-6 py-4 rounded-2xl shadow-xl flex items-center justify-center space-x-4 transition-colors duration-300">
          <div className="text-3xl font-black tabular-nums">{formatTime(timer)}</div>
          {isActive && (
            <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse"></div>
          )}
        </div>
      </div>

      <div className="px-6 mt-12 mb-4">
        {/* Toggle Local */}
        {!isActive && timer === 0 && (
          <div className="flex bg-gray-200 dark:bg-gray-800 rounded-xl p-1 mb-6 transition-colors duration-300">
            <button 
              onClick={() => setLocal('casa')}
              className={`flex-1 py-2 font-bold text-sm rounded-lg transition-colors ${local === 'casa' ? 'bg-white dark:bg-gray-700 text-[var(--color-primary)] shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
            >
              Em Casa
            </button>
            <button 
              onClick={() => setLocal('academia')}
              className={`flex-1 py-2 font-bold text-sm rounded-lg transition-colors ${local === 'academia' ? 'bg-white dark:bg-gray-700 text-[var(--color-primary)] shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
            >
              Na Academia
            </button>
          </div>
        )}

        <h2 className="font-bold text-gray-800 dark:text-gray-100 mb-4">Exercícios do Dia</h2>
        <div className="space-y-3">
          {exercicios.map((ex, idx) => {
            const isDone = completedExercises[idx];
            return (
              <div 
                key={idx} 
                onClick={() => isActive && toggleExercise(idx)}
                className={`bg-white dark:bg-gray-800 p-4 rounded-2xl border transition-all duration-300 flex items-center shadow-sm ${!isActive ? 'opacity-50 grayscale cursor-not-allowed' : 'cursor-pointer hover:shadow-md'} ${isDone ? 'border-[var(--color-primary)] bg-orange-50/30 dark:bg-orange-900/20' : 'border-gray-100 dark:border-gray-700'}`}
              >
                <div className="mr-4">
                  {isDone ? (
                    <CheckCircle2 className="text-[var(--color-primary)]" size={28} />
                  ) : (
                    <Circle className="text-gray-300 dark:text-gray-600" size={28} />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className={`font-bold ${isDone ? 'text-gray-900 dark:text-gray-100 line-through decoration-orange-300 decoration-2' : 'text-gray-900 dark:text-gray-100'}`}>{ex.nome}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-bold mt-1">{ex.foco}</p>
                </div>
                <div className="text-right flex flex-col items-end">
                  <span className="text-[var(--color-primary)] font-black text-xl leading-none">{ex.series}x</span>
                  <span className="text-sm font-bold text-gray-600 dark:text-gray-400 mt-1">{ex.reps}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Control Bar fixa embaixo */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center items-center space-x-6 px-6 pointer-events-none">
        <div className="pointer-events-auto flex items-center space-x-4">
          {isActive ? (
            <>
              <button onClick={finishTraining} className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-700 shadow-lg active:scale-95 transition-all">
                <Square fill="white" size={24} />
              </button>
              <button onClick={togglePause} className="w-20 h-20 bg-[var(--color-primary)] rounded-full flex items-center justify-center hover:bg-orange-600 shadow-xl shadow-orange-500/30 active:scale-95 transition-all">
                {isPaused ? <Play fill="white" size={32} className="ml-1" /> : <Pause fill="white" size={32} />}
              </button>
            </>
          ) : (
            <button onClick={togglePause} className="w-full min-w-[200px] h-16 bg-[var(--color-primary)] text-white font-bold text-lg rounded-full flex items-center justify-center hover:bg-orange-600 shadow-xl shadow-orange-500/30 active:scale-95 transition-all">
              <Play fill="white" size={24} className="mr-2" />
              INICIAR TREINO
            </button>
          )}
        </div>
      </div>

    </div>
  );
}
