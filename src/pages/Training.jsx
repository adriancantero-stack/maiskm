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
  const [isActive, setIsActive] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [timer, setTimer] = useState(0); // em segundos
  const [isMuted, setIsMuted] = useState(false);
  const [autoPaused, setAutoPaused] = useState(false);
  const hasPhases = treinoHoje && ['intervalado', 'continuo', 'longo', 'corrida'].includes(treinoHoje.tipo);
  const [fase, setFase] = useState(hasPhases ? 'AQUECIMENTO' : 'TREINO');
  const finishBtnRef = useRef(null);
  
  const warmupDistance = useRef(0);
  const cooldownDistance = useRef(0);
  
  const { requestWakeLock, releaseWakeLock } = useWakeLock();
  const { distance, currentPace, gpsAccuracy, error } = useGeolocation(isActive && !isPaused);
  const { speak } = useVoice(perfil);

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
      if (!isMuted) speak("Corpo aquecido! Agora comece o seu treino principal de corrida.");
    }

    if (fase === 'TREINO' && timer >= AQUECIMENTO_SEC + TREINO_SEC) {
      cooldownDistance.current = distance; // Guarda a distância até o fim do treino
      setFase('DESAQUECIMENTO');
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

  // Lógica do Cronômetro
  useEffect(() => {
    let interval = null;
    if (isActive && !isPaused) {
      interval = setInterval(() => {
        setTimer((t) => t + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, isPaused]);

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
    
    // Salvar no IndexedDB (Somente os dados reais da corrida)
    await db.sessoes.add({
      data: new Date(),
      duracao: tempoCorrida,
      distancia: distCorrida,
      paceMedio: tempoCorrida > 0 && distCorrida > 0 ? tempoCorrida / (distCorrida / 1000) : 0,
      calorias: Math.round((perfil?.peso || 70) * (distCorrida / 1000) * 1.036),
      splits: [], 
      planoRef: perfil?.distanciaAlvo,
    });

    navigate('/history');
  };

  const cancelTraining = () => {
    if (window.confirm("Deseja desistir deste treino? Ele não será salvo no histórico.")) {
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
        <div className="absolute top-24 w-full flex justify-center">
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

      {/* Main Stats */}
      <div className="text-center mt-12 mb-16 w-full">
        <p className="text-gray-400 font-bold tracking-widest text-sm mb-2">DISTÂNCIA</p>
        <div className="text-[5rem] font-black leading-none mb-2 tabular-nums tracking-tighter">
          {formatDistance(displayDistance)}
        </div>
        <p className="text-gray-400 text-xl font-medium">km</p>
      </div>

      <div className="grid grid-cols-2 gap-8 w-full max-w-sm mb-16">
        <div className="text-center">
          <p className="text-gray-400 text-xs font-bold mb-1 tracking-wider">TEMPO</p>
          <p className="text-4xl font-bold tabular-nums">{formatTime(displayTimer)}</p>
        </div>
        <div className="text-center">
          <p className="text-gray-400 text-xs font-bold mb-1 tracking-wider">PACE</p>
          <p className="text-4xl font-bold tabular-nums">{formatPace(currentPace)}</p>
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
