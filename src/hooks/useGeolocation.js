import { useState, useEffect, useRef, useCallback } from 'react';
import { getDistance } from '../utils/haversine';

export function useGeolocation(isActive, initialDistance = 0) {
  const [distance, setDistance] = useState(initialDistance); // em metros
  const [currentPace, setCurrentPace] = useState(0); // segundos por km
  const [lastPosition, setLastPosition] = useState(null);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [error, setError] = useState(null);
  
  const watchIdRef = useRef(null);
  const pointsQueueRef = useRef([]); // Para cálculo de pace médio móvel (últimos 20s)

  const processPosition = useCallback((position) => {
    const { latitude, longitude, accuracy } = position.coords;
    setGpsAccuracy(accuracy);

    // Filtro de acurácia mais rígido (ignorar se a margem de erro for > 15m)
    if (accuracy > 15) return;

    const timestamp = position.timestamp;

    setLastPosition((prev) => {
      if (prev) {
        const timeDiff = (timestamp - prev.timestamp) / 1000; // segundos

        // Ignora pontos gerados rápido demais (< 2s) para evitar o "efeito zig-zag" que infla a distância.
        if (timeDiff < 2) {
          return prev; 
        }

        // Calcula distância
        const dist = getDistance(prev.latitude, prev.longitude, latitude, longitude);
        
        // Verifica a velocidade (metros por segundo)
        const velocidade = dist / timeDiff;

        // Filtro de Teletransporte (GPS Jump):
        // Se a velocidade for maior que 12 m/s, é um pulo do GPS.
        // Se andou menos de 1.5 metros em >2 segundos, é drift (parado).
        if (velocidade > 12 || dist < 1.5) {
          // Ignora a distância falsa, mas não atualiza a última posição válida
          return prev;
        }

        setDistance((d) => d + dist);

        // Lógica de pace atual
        pointsQueueRef.current.push({ dist, timeDiff, timestamp });
        
        // Manter apenas últimos 30 segundos para média móvel de pace (mais suave)
        pointsQueueRef.current = pointsQueueRef.current.filter(p => timestamp - p.timestamp < 30000);
        
        let totalDist = 0;
        let totalTime = 0;
        for (let p of pointsQueueRef.current) {
          totalDist += p.dist;
          totalTime += p.timeDiff;
        }
        if (totalDist > 0) {
          setCurrentPace((totalTime / totalDist) * 1000);
        }
      }
      return { latitude, longitude, timestamp };
    });
  }, []);

  useEffect(() => {
    if (!isActive) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      // Limpa os pontos antigos ao pausar
      pointsQueueRef.current = [];
      setLastPosition(null);
      setCurrentPace(0);
      return;
    }

    if (!navigator.geolocation) {
      setError("Geolocalização não suportada.");
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      processPosition,
      (err) => {
        console.error("GPS Error:", err);
        setError(err.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 2000,
        timeout: 10000
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [isActive, processPosition]);

  const resetGPS = () => {
    setDistance(0);
    setCurrentPace(0);
    setLastPosition(null);
    pointsQueueRef.current = [];
  };

  return { distance, currentPace, gpsAccuracy, error, resetGPS };
}
