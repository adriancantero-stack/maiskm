import { useState, useEffect, useRef, useCallback } from 'react';
import { getDistance } from '../utils/haversine';

export function useGeolocation(isActive) {
  const [distance, setDistance] = useState(0); // em metros
  const [currentPace, setCurrentPace] = useState(0); // segundos por km
  const [lastPosition, setLastPosition] = useState(null);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [error, setError] = useState(null);
  
  const watchIdRef = useRef(null);
  const pointsQueueRef = useRef([]); // Para cálculo de pace médio móvel (últimos 20s)

  const processPosition = useCallback((position) => {
    const { latitude, longitude, accuracy } = position.coords;
    setGpsAccuracy(accuracy);

    // Filtro de acurácia (ignorar se > 20m)
    if (accuracy > 20) return;

    const timestamp = position.timestamp;

    setLastPosition((prev) => {
      if (prev) {
        // Calcula distância
        const dist = getDistance(prev.latitude, prev.longitude, latitude, longitude);
        
        // Se andou uma distância mínima, contabiliza (evita drift de GPS parado)
        if (dist > 2) {
          setDistance((d) => d + dist);

          // Lógica de pace atual
          const timeDiff = (timestamp - prev.timestamp) / 1000; // segundos
          if (timeDiff > 0) {
            const pace = (timeDiff / dist) * 1000; // sec / km
            pointsQueueRef.current.push({ dist, timeDiff, timestamp });
            
            // Manter apenas últimos 20 segundos para média móvel de pace
            pointsQueueRef.current = pointsQueueRef.current.filter(p => timestamp - p.timestamp < 20000);
            
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
