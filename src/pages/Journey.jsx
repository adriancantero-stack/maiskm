import { useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import planosData from '../data/trainingPlans.json';
import { Check, Lock, MapPin, Trophy, Dumbbell } from 'lucide-react';

export function JourneyPage() {
  const perfil = useLiveQuery(() => db.perfil.get(1));
  const scrollRef = useRef(null);

  // Lógica de tempo (Qual dia estamos)
  const dataInicio = perfil ? new Date(perfil.dataInicioPlano) : new Date();
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  dataInicio.setHours(0, 0, 0, 0);
  const diffTime = hoje - dataInicio;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // Total de dias corridos desde o início (dia absoluto)
  const diaAbsolutoAtual = perfil ? Math.max(0, diffDays) : 0;

  // Auto-scroll para o dia atual quando a página abre
  useEffect(() => {
    if (!perfil) return;
    if (scrollRef.current) {
      // Pequeno delay para garantir a renderização
      setTimeout(() => {
        const activeNode = document.getElementById(`node-${diaAbsolutoAtual}`);
        if (activeNode) {
          activeNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    }
  }, [diaAbsolutoAtual, perfil]);

  if (!perfil) return <div className="p-4 text-center mt-10">Carregando mapa...</div>;

  const nivelText = perfil.nivel || 'iniciante';
  const alvoText = perfil.distanciaAlvo || '5km';

  // Busca do plano
  const plano = planosData[alvoText]?.[nivelText] || planosData["5km"]["iniciante"];
  
  // Flatten todas as semanas e dias em um único array
  const jornada = [];
  plano.semanas.forEach(semana => {
    semana.dias.forEach(dia => {
      jornada.push({
        ...dia,
        semanaNum: semana.semana,
        diaAbsoluto: (semana.semana - 1) * 7 + dia.dia,
      });
    });
  });

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-gray-900 transition-colors duration-300 flex flex-col pb-24" ref={scrollRef}>
      <header className="bg-[var(--color-primary)] text-white p-6 pt-12 pb-10 rounded-b-[2rem] shadow-md text-center sticky top-0 z-10 transition-colors duration-300">
        <h1 className="text-2xl font-black mb-1">Seu Caminho</h1>
        <p className="text-sm opacity-90">Nível: {nivelText.toUpperCase()}</p>
      </header>

      <div className="flex-1 px-4 py-8 relative max-w-md mx-auto w-full">
        {/* Troféu Gigante no Topo (Final da Jornada) */}
        <div className="flex flex-col items-center justify-center mb-12">
          <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center shadow-lg border-4 border-yellow-300 relative z-10">
            <Trophy size={48} className="text-yellow-500 drop-shadow-md" />
          </div>
          <h2 className="font-black text-xl text-gray-800 mt-4">Linha de Chegada</h2>
          <p className="text-sm font-bold text-gray-400">Distância Alvo: {alvoText.toUpperCase()}</p>
        </div>

        {/* Caminho Sinuoso de fundo (Largo e Suave) */}
        <div className="absolute left-1/2 top-32 bottom-20 w-8 bg-gray-100/50 dark:bg-gray-800/50 rounded-full blur-md -translate-x-1/2 z-0"></div>

        <div className="space-y-6 relative z-10">
          {/* Renderiza o mapa de cima para baixo (do último dia para o primeiro) */}
          {[...jornada].reverse().map((fase, idx) => {
            const isCompleted = fase.diaAbsoluto < diaAbsolutoAtual;
            const isToday = fase.diaAbsoluto === diaAbsolutoAtual;
            const isFuture = fase.diaAbsoluto > diaAbsolutoAtual;
            
            // Sinuosidade (Curve)
            const curveOffset = Math.sin(idx * 0.6) * 35; // Move até 35px para os lados

            // Coloca o card SEMPRE no lado que tem mais espaço para não sair da tela!
            const isLeft = curveOffset >= 0; 

            let bgColor = "bg-gray-100 dark:bg-gray-800";
            let borderColor = "border-gray-200 dark:border-gray-700";
            let icon = <Lock size={20} className="text-gray-400 dark:text-gray-500" />;
            
            if (isCompleted) {
              bgColor = "bg-green-100 dark:bg-green-900/30";
              borderColor = "border-green-500 dark:border-green-400";
              icon = <Check size={20} className="text-green-600 dark:text-green-400 font-bold" />;
            } else if (isToday) {
              bgColor = "bg-orange-100 dark:bg-orange-900/40 animate-pulse";
              borderColor = "border-[var(--color-primary)] border-4";
              icon = <span className="text-2xl drop-shadow-sm">🏃‍♂️</span>;
            }

            // Ícone especial para descanso ou força
            if (isCompleted) {
              if (fase.tipo === 'forca') icon = <Dumbbell size={20} className="text-green-600 dark:text-green-400" />;
            } else if (isFuture) {
              if (fase.tipo === 'forca') icon = <Dumbbell size={20} className="text-gray-400 dark:text-gray-500" />;
            }

            // Frases motivacionais espalhadas
            const frases = [
              "Um passo de cada vez!",
              "Confie no processo.",
              "Sua única competição é você mesmo.",
              "A consistência é a chave.",
              "O suor de hoje é o seu escudo de amanhã.",
              "Não existe atalho."
            ];
            const temFrase = fase.diaAbsoluto > 0 && fase.diaAbsoluto % 4 === 0; // Uma frase a cada 4 dias
            const frase = frases[(fase.diaAbsoluto / 4) % frases.length];

            return (
              <div key={fase.diaAbsoluto} id={`node-${fase.diaAbsoluto}`} className="flex flex-col items-center">
                
                {temFrase && isFuture && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-4 shadow-sm border border-blue-100 dark:border-blue-800/50">
                    "{frase}"
                  </div>
                )}

                <div 
                  className={`flex items-center w-full ${isLeft ? 'flex-row-reverse' : 'flex-row'}`}
                  style={{ transform: `translateX(${curveOffset}px)` }}
                >
                  {/* Espaço em branco no lado oposto para empurrar pro centro */}
                  <div className="flex-1"></div>
                  
                  {/* O Nó (Bolinha) */}
                  <div className="w-16 flex justify-center relative">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center border-4 shadow-sm z-10 transition-all duration-300 ${bgColor} ${borderColor} ${isToday ? 'scale-110 shadow-orange-200 dark:shadow-none shadow-xl' : ''}`}>
                      {icon}
                    </div>
                  </div>

                  {/* O Card Informativo */}
                  <div className={`flex-1 flex ${isLeft ? 'justify-end pr-4' : 'justify-start pl-4'}`}>
                    <div className={`bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 w-full max-w-[135px] text-center transition-colors duration-300 ${isFuture ? 'opacity-60' : ''}`}>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">S{fase.semanaNum} • Dia {fase.dia}</p>
                      <p className={`font-bold text-sm leading-tight ${isToday ? 'text-[var(--color-primary)]' : 'text-gray-800 dark:text-gray-100'}`}>
                        {fase.titulo}
                      </p>
                      {fase.tempo > 0 && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{fase.tempo} min</p>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Base do Caminho (Início) */}
        <div className="flex flex-col items-center justify-center mt-12 relative z-10">
          <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-md border-4 border-gray-200 dark:border-gray-700 transition-colors duration-300">
            <span className="font-black text-gray-400 dark:text-gray-500">Início</span>
          </div>
        </div>

      </div>
    </div>
  );
}
