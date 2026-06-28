import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGeolocation } from '../hooks/useGeolocation';
import { useWakeLock } from '../hooks/useWakeLock';
import { useVoice } from '../hooks/useVoice';
import { formatPace, formatTime, formatDistance } from '../utils/formatters';
import { Play, Pause, Square, Volume2, VolumeX, X } from 'lucide-react';
import { db } from '../db/database';
import { useLiveQuery } from 'dexie-react-hooks';

export function TrainingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const treinoHoje = location.state?.treino || null;
  
  const perfil = useLiveQuery(() => db.perfil.get(1));
  // Carrega estado de recovery (anti-crash)
  const [initialState] = useState(() => {
    const saved = localStorage.getItem('maiskm_running_state');
    if (saved) {
      try {
        const state = JSON.parse(saved);
        // Recupera apenas se for do mesmo treino e tiver menos de 2 horas
        if (Date.now() - state.lastUpdate < 2 * 60 * 60 * 1000 && (!treinoHoje || state.treinoId === treinoHoje.id)) {
          return state;
        }
      } catch (e) { console.error(e); }
    }
    return null;
  });

  const hasPhases = treinoHoje && ['intervalado', 'continuo', 'longo', 'corrida'].includes(treinoHoje.tipo);
  
  const [fase, setFase] = useState(initialState?.fase || (hasPhases ? 'AQUECIMENTO' : 'TREINO'));
  const [isActive, setIsActive] = useState(true);
  const [isPaused, setIsPaused] = useState(initialState ? true : false); // Se recuperou, entra pausado por segurança
  const [timer, setTimer] = useState(initialState?.timer || 0); // em segundos
  const [isMuted, setIsMuted] = useState(false);
  const [autoPaused, setAutoPaused] = useState(false);
  
  const finishBtnRef = useRef(null);
  
  const warmupDistance = useRef(initialState?.warmupDistance || 0);
  const cooldownDistance = useRef(initialState?.cooldownDistance || 0);
  
  const startTimeRef = useRef(Date.now());
  const accumulatedTimeRef = useRef(initialState?.accumulatedTime || (initialState?.timer || 0));

  const { requestWakeLock, releaseWakeLock } = useWakeLock();
  const { distance, currentPace, gpsAccuracy, error, clearPaceQueue } = useGeolocation(isActive && !isPaused, initialState?.distance || 0);
  const { speak } = useVoice(perfil);

  const splitsRef = useRef(initialState?.splits || []);
  const lastSplitKmRef = useRef(initialState?.splits?.length || 0);
  const lastSplitTimeRef = useRef(0);

  const lastSpokenKm = useRef(0);
  const halfTimeSpoken = useRef(false);
  const startSpoken = useRef(false);

  // Lógica do Voice Coach e Fases
  useEffect(() => {
    if (!isActive || isPaused || isMuted) return;

    if (!startSpoken.current) {
      const motivacionais = [
        "Vamos pra cima!",
        "Um passo de cada vez.",
        "Lembre-se de respirar fundo.",
        "Você consegue!",
        "Hoje é o seu dia.",
        "Aproveite a sua corrida.",
        "Mantenha o foco!"
      ];
      const fraseMotivacional = motivacionais[Math.floor(Math.random() * motivacionais.length)];
      const objetivo = treinoHoje ? `Objetivo de hoje: ${treinoHoje.titulo}.` : 'Bom treino!';
      
      if (hasPhases) {
        speak(`Treino iniciado. ${objetivo} Vamos começar com 5 minutos de caminhada rápida para aquecer o corpo.`);
      } else {
        speak(`Treino iniciado. ${objetivo} ${fraseMotivacional}`);
      }
      startSpoken.current = true;
    }

    const currentKm = Math.floor(distance / 1000);
    if (currentKm > lastSpokenKm.current) {
      lastSpokenKm.current = currentKm;
      const paceMsg = currentPace ? `Pace atual: ${Math.floor(currentPace)} minutos por quilômetro.` : '';
      speak(`Você completou ${currentKm} quilômetro${currentKm > 1 ? 's' : ''}. ${paceMsg}`);
    }

    if (treinoHoje?.tempo && !halfTimeSpoken.current) {
      const halfTimeSec = (treinoHoje.tempo * 60) / 2;
      const startOffset = hasPhases ? 300 : 0;
      if (timer >= startOffset + halfTimeSec) {
        halfTimeSpoken.current = true;
        speak("Metade do treino concluída. Mantenha o ritmo!");
      }
    }
  }, [distance, timer, isActive, isPaused, isMuted, speak, treinoHoje, currentPace, hasPhases]);

  // Transições de Fases (Aquecimento -> Treino -> Desaquecimento)
  useEffect(() => {
    if (!isActive || isPaused || !hasPhases) return;

    const AQUECIMENTO_SEC = 300; // 5 min
    const TREINO_SEC = treinoHoje?.tempo ? treinoHoje.tempo * 60 : 1800; // Tempo do plano
    const DESAQUECIMENTO_SEC = 180; // 3 min

    if (fase === 'AQUECIMENTO' && timer >= AQUECIMENTO_SEC) {
      warmupDistance.current = distance; // Guarda a distância andada no aquecimento
      setFase('TREINO');
      clearPaceQueue();
      if (!isMuted) speak("Corpo aquecido! Agora comece o seu treino principal de corrida.");
    }

    if (fase === 'TREINO' && timer >= AQUECIMENTO_SEC + TREINO_SEC) {
      cooldownDistance.current = distance; // Guarda a distância até o fim do treino
      setFase('DESAQUECIMENTO');
      clearPaceQueue();
      if (!isMuted) speak("Treino principal concluído. Vamos caminhar devagar por 3 minutos para desaquecer e relaxar.");
    }

    if (fase === 'DESAQUECIMENTO' && timer >= AQUECIMENTO_SEC + TREINO_SEC + DESAQUECIMENTO_SEC) {
      setFase('FINALIZADO');
      if (!isMuted) speak("Desaquecimento concluído. Treino finalizado com sucesso! Parabéns!");
      setTimeout(() => {
         finishBtnRef.current?.click();
      }, 5000);
    }
  }, [timer, isActive, isPaused, hasPhases, fase, isMuted, speak, treinoHoje]);

  // Lógica do WakeLock (separada do cronômetro para evitar loops)
  useEffect(() => {
    if (isActive && !isPaused) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
  }, [isActive, isPaused, requestWakeLock, releaseWakeLock]);

  // Monitora e grava Splits (Parciais por KM) apenas na fase TREINO
  useEffect(() => {
    if (!isActive || isPaused) return;
    if (hasPhases && fase !== 'TREINO') return;

    let distFase = hasPhases ? distance - warmupDistance.current : distance;
    let tempoFase = hasPhases ? timer - 300 : timer;
    if (distFase < 0) distFase = 0;
    if (tempoFase < 0) tempoFase = 0;

    const currentKm = Math.floor(distFase / 1000);

    if (currentKm > lastSplitKmRef.current) {
      const tempoParaEsteKm = tempoFase - lastSplitTimeRef.current;
      splitsRef.current.push({
        km: currentKm,
        ritmo: tempoParaEsteKm
      });
      lastSplitKmRef.current = currentKm;
      lastSplitTimeRef.current = tempoFase;
    }
  }, [distance, timer, isActive, isPaused, fase, hasPhases]);

  // Lógica do Cronômetro Imortal (Resistente a background freeze)
  useEffect(() => {
    let interval = null;
    if (isActive && !isPaused) {
      startTimeRef.current = Date.now();
      interval = setInterval(() => {
        const currentDelta = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setTimer(accumulatedTimeRef.current + currentDelta);
      }, 1000);
    } else {
      if (timer > 0) {
        accumulatedTimeRef.current = timer;
      }
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, isPaused]);

  // Auto-Save de Segurança (Anti-Crash) a cada 5 segundos
  useEffect(() => {
    if (isActive && !isPaused) {
      const saveInterval = setInterval(() => {
        localStorage.setItem('maiskm_running_state', JSON.stringify({
          timer,
          distance,
          fase,
          warmupDistance: warmupDistance.current,
          cooldownDistance: cooldownDistance.current,
          accumulatedTime: timer,
          lastUpdate: Date.now(),
          treinoId: treinoHoje?.id || null,
          splits: splitsRef.current
        }));
      }, 5000);
      return () => clearInterval(saveInterval);
    }
  }, [isActive, isPaused, timer, distance, fase, treinoHoje]);

  const lastDistRef = useRef(0);
  const timeAtLastMoveRef = useRef(0);

  // Monitora a distância para retomar se estiver em auto-pause
  useEffect(() => {
    if (distance > lastDistRef.current) {
      if (autoPaused) {
        setAutoPaused(false);
        setIsPaused(false);
        if (!isMuted) speak("Treino retomado automaticamente.");
      }
      lastDistRef.current = distance;
      timeAtLastMoveRef.current = timer;
    }
  }, [distance, autoPaused, isMuted, speak, timer]);

  // Monitora o tempo sem mover para ativar o auto-pause (DESATIVADO TEMPORARIAMENTE)
  useEffect(() => {
    if (isActive && !isPaused && timer > 0) {
      if (timer - timeAtLastMoveRef.current > 20) {
        // Função desativada a pedido do usuário para testes
        // setAutoPaused(true);
        // setIsPaused(true);
        // if (!isMuted) speak("Treino pausado automaticamente.");
      }
    }
  }, [timer, isActive, isPaused, isMuted, speak]);
  const togglePause = () => {
    if (isActive && !isPaused) {
      setIsPaused(true);
      setAutoPaused(false);
      if (!isMuted) speak("Treino pausado.");
    } else if (isActive && isPaused) {
      setIsPaused(false);
      setAutoPaused(false);
      timeAtLastMoveRef.current = timer;
      if (!isMuted) speak("Treino retomado.");
    }
  };

  const finishTraining = async () => {
    // Calcular apenas a parte da CORRIDA, excluindo aquecimento e desaquecimento
    let distCorrida = distance;
    let tempoCorrida = timer;

    if (hasPhases) {
      if (fase === 'AQUECIMENTO') {
        distCorrida = 0; // Só aqueceu e parou
        tempoCorrida = 0;
      } else if (fase === 'TREINO') {
        distCorrida = distance - warmupDistance.current;
        tempoCorrida = timer - 300; // Tira os 5 min de aquecimento
      } else if (fase === 'DESAQUECIMENTO' || fase === 'FINALIZADO') {
        distCorrida = cooldownDistance.current - warmupDistance.current;
        tempoCorrida = treinoHoje?.tempo ? treinoHoje.tempo * 60 : 1800; // Apenas o tempo cravado do treino
      }
    }

    // Para evitar tempo/distancia negativos por bugs
    if (distCorrida < 0) distCorrida = 0;
    if (tempoCorrida < 0) tempoCorrida = 0;

    if (!isMuted && tempoCorrida > 0) {
      const minutos = Math.floor(tempoCorrida / 60);
      const segundos = tempoCorrida % 60;
      let tempoStr = "";
      if (minutos > 0) tempoStr += `${minutos} minuto${minutos !== 1 ? 's' : ''}`;
      if (segundos > 0) tempoStr += `${minutos > 0 ? ' e ' : ''}${segundos} segundo${segundos !== 1 ? 's' : ''}`;
      
      let distStr = "";
      if (distCorrida < 1000) {
        distStr = `${Math.floor(distCorrida)} metros`;
      } else {
        const km = (distCorrida / 1000).toFixed(1).replace('.', ' vírgula ');
        distStr = `${km} quilômetros`;
      }

      let paceStr = "";
      if (distCorrida >= 100) { 
        const paceMedio = tempoCorrida / (distCorrida / 1000);
        if (paceMedio > 0 && paceMedio < 3600) { 
          const paceMin = Math.floor(paceMedio / 60);
          const paceSec = Math.floor(paceMedio % 60);
          paceStr = ` com um pace médio de ${paceMin} minutos e ${paceSec} segundos por quilômetro`;
        }
      }
      
      speak(`Treino finalizado. Bom trabalho! Você completou ${distStr} de corrida em ${tempoStr}${paceStr}.`);
    } else if (!isMuted && tempoCorrida === 0) {
      speak("Treino finalizado no aquecimento.");
    }
    
    setIsActive(false);
    setIsPaused(true);
    releaseWakeLock();
    
    // Grava a última parcial fracionada se houver resto
    const restoMeters = distCorrida % 1000;
    if (restoMeters > 15) {
      const tempoFracao = tempoCorrida - lastSplitTimeRef.current;
      const ritmoProporcional = tempoFracao / (restoMeters / 1000);
      splitsRef.current.push({
        km: (distCorrida / 1000).toFixed(2).replace('.', ','),
        ritmo: ritmoProporcional,
        isFraction: true,
        fracaoText: `${Math.floor(restoMeters)}m`
      });
    }

    // Salvar no IndexedDB (Somente os dados reais da corrida)
    await db.sessoes.add({
      data: new Date(),
      duracao: tempoCorrida,
      distancia: distCorrida,
      paceMedio: tempoCorrida > 0 && distCorrida > 0 ? tempoCorrida / (distCorrida / 1000) : 0,
      calorias: Math.round((perfil?.peso || 70) * (distCorrida / 1000) * 1.036),
      splits: splitsRef.current, 
      planoRef: perfil?.distanciaAlvo,
    });

    localStorage.removeItem('maiskm_running_state'); // Limpa o backup
    navigate('/history');
  };

  const cancelTraining = () => {
    if (window.confirm("Deseja desistir deste treino? Ele não será salvo no histórico.")) {
      localStorage.removeItem('maiskm_running_state'); // Limpa o backup
      releaseWakeLock();
      navigate('/home');
    }
  };

  // Cálculos para exibição separada na tela por fase
  let displayDistance = distance;
  let displayTimer = timer;

  if (hasPhases) {
    if (fase === 'AQUECIMENTO') {
      displayDistance = distance;
      displayTimer = timer;
    } else if (fase === 'TREINO') {
      displayDistance = distance - warmupDistance.current;
      displayTimer = timer - 300; // 5 min de aquecimento
    } else if (fase === 'DESAQUECIMENTO' || fase === 'FINALIZADO') {
      displayDistance = distance - cooldownDistance.current;
      displayTimer = timer - 300 - (treinoHoje?.tempo ? treinoHoje.tempo * 60 : 1800);
    }
  }

  // Previne números negativos visuais por pequenos delays
  if (displayDistance < 0) displayDistance = 0;
  if (displayTimer < 0) displayTimer = 0;

  const getDistanceDisplay = (meters) => {
    if (meters < 1000) {
      return { val: Math.floor(meters).toString(), unit: "metros" };
    } else {
      return { val: (meters / 1000).toFixed(3).replace('.', ','), unit: "km" };
    }
  };
  const { val: distVal, unit: distUnit } = getDistanceDisplay(displayDistance);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6 relative">
      {/* Header Info */}
      <div className="absolute top-6 left-6 right-6 flex justify-between items-center">
        <button onClick={cancelTraining} className="p-2 bg-gray-800 rounded-full active:scale-95 transition-transform">
          <X size={20} className="text-gray-400" />
        </button>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${gpsAccuracy && gpsAccuracy < 20 ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-xs text-gray-400 font-medium">GPS {gpsAccuracy ? `${Math.round(gpsAccuracy)}m` : 'Buscando...'}</span>
        </div>
        <button onClick={() => setIsMuted(!isMuted)} className="p-2 bg-gray-800 rounded-full active:scale-95 transition-transform">
          {isMuted ? <VolumeX size={20} className="text-gray-400" /> : <Volume2 size={20} className="text-[var(--color-primary)]" />}
        </button>
      </div>

      {error && <div className="absolute top-20 bg-red-500 text-white p-2 text-xs rounded">{error}</div>}

      {/* Fase atual */}
      {hasPhases && (
        <div className="w-full flex justify-center mb-8">
          <div className={`px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${
            fase === 'AQUECIMENTO' ? 'bg-blue-500/20 text-blue-400' :
            fase === 'TREINO' ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]' :
            fase === 'DESAQUECIMENTO' ? 'bg-purple-500/20 text-purple-400' :
            'bg-gray-800 text-gray-400'
          }`}>
            {fase}
          </div>
        </div>
      )}

      {/* Main Stats - Vertical Layout */}
      <div className="flex flex-col items-center justify-center w-full space-y-10 mb-16">
        
        {/* Distancia */}
        <div className="text-center">
          <p className="text-gray-400 font-bold tracking-widest text-xs mb-1 uppercase">DISTÂNCIA</p>
          <div className="flex items-baseline justify-center space-x-2">
            <span className="text-[6rem] font-black leading-none tabular-nums tracking-tighter">
              {distVal}
            </span>
            <span className="text-gray-400 text-2xl font-medium">{distUnit}</span>
          </div>
        </div>

        {/* Tempo */}
        <div className="text-center">
          <p className="text-gray-400 font-bold tracking-widest text-xs mb-1 uppercase">TEMPO</p>
          <span className="text-[4.5rem] font-black leading-none tabular-nums tracking-tighter">
            {formatTime(displayTimer)}
          </span>
        </div>

        {/* Pace */}
        <div className="text-center">
          <p className="text-gray-400 font-bold tracking-widest text-xs mb-1 uppercase">RITMO MÉDIO</p>
          <span className="text-[4.5rem] font-black leading-none tabular-nums tracking-tighter text-[var(--color-primary)]">
            {formatPace(currentPace)}
          </span>
        </div>

      </div>

      {/* Controls */}
      <div className="flex items-center justify-center space-x-6">
        {isPaused ? (
          <>
            <button ref={finishBtnRef} onClick={finishTraining} className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-700 active:scale-95 transition-all">
              <Square fill="white" size={28} />
            </button>
            <button onClick={togglePause} className="w-24 h-24 bg-[var(--color-primary)] rounded-full flex items-center justify-center hover:bg-orange-600 active:scale-95 shadow-lg shadow-orange-500/30 transition-all">
              <Play fill="white" size={36} className="ml-2" />
            </button>
          </>
        ) : (
          <button onClick={togglePause} className="w-24 h-24 bg-[var(--color-primary)] rounded-full flex items-center justify-center hover:bg-orange-600 active:scale-95 shadow-lg shadow-orange-500/30 transition-all">
            <Pause fill="white" size={36} />
          </button>
        )}
      </div>
    </div>
  );
}
