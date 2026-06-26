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
  
  const { requestWakeLock, releaseWakeLock } = useWakeLock();
  const { distance, currentPace, gpsAccuracy, error } = useGeolocation(isActive && !isPaused);
  const { speak } = useVoice(perfil);

  const lastSpokenKm = useRef(0);
  const halfTimeSpoken = useRef(false);
  const startSpoken = useRef(false);

  // Lógica do Voice Coach
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
      
      speak(`Treino iniciado. ${objetivo} ${fraseMotivacional}`);
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
      if (timer >= halfTimeSec) {
        halfTimeSpoken.current = true;
        speak("Metade do treino concluída. Mantenha o ritmo!");
      }
    }
  }, [distance, timer, isActive, isPaused, isMuted, speak, treinoHoje, currentPace]);

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

  const togglePause = () => {
    if (isActive && !isPaused) {
      setIsPaused(true);
      if (!isMuted) speak("Treino pausado.");
    } else if (isActive && isPaused) {
      setIsPaused(false);
      if (!isMuted) speak("Treino retomado.");
    }
  };

  const finishTraining = async () => {
    if (!isMuted) {
      const minutos = Math.floor(timer / 60);
      const segundos = timer % 60;
      let tempoStr = "";
      if (minutos > 0) tempoStr += `${minutos} minuto${minutos !== 1 ? 's' : ''}`;
      if (segundos > 0) tempoStr += `${minutos > 0 ? ' e ' : ''}${segundos} segundo${segundos !== 1 ? 's' : ''}`;
      
      let distStr = "";
      if (distance < 1000) {
        distStr = `${Math.floor(distance)} metros`;
      } else {
        const km = (distance / 1000).toFixed(1).replace('.', ' vírgula ');
        distStr = `${km} quilômetros`;
      }
      
      speak(`Treino finalizado. Bom trabalho! Você completou ${distStr} em ${tempoStr}.`);
    }
    setIsActive(false);
    setIsPaused(true);
    releaseWakeLock();
    
    // Salvar no IndexedDB
    await db.sessoes.add({
      data: new Date(),
      duracao: timer,
      distancia: distance,
      paceMedio: timer / (distance / 1000),
      calorias: Math.round((perfil?.peso || 70) * (distance / 1000) * 1.036),
      splits: [], // MVP simplificado
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

      {/* Main Stats */}
      <div className="text-center mt-12 mb-16 w-full">
        <p className="text-gray-400 font-bold tracking-widest text-sm mb-2">DISTÂNCIA</p>
        <div className="text-[5rem] font-black leading-none mb-2 tabular-nums tracking-tighter">
          {formatDistance(distance)}
        </div>
        <p className="text-gray-400 text-xl font-medium">km</p>
      </div>

      <div className="grid grid-cols-2 gap-8 w-full max-w-sm mb-16">
        <div className="text-center">
          <p className="text-gray-400 text-xs font-bold mb-1 tracking-wider">TEMPO</p>
          <p className="text-4xl font-bold tabular-nums">{formatTime(timer)}</p>
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
            <button onClick={finishTraining} className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-700 active:scale-95 transition-all">
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
