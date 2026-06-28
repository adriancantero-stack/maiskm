// pace em segundos por km -> "MM:SS"
export function formatPace(paceSecs) {
  // Ignora paces impossivelmente lentos (maior que 20 min/km = 1200 segs) que ocorrem por GPS drift parado
  if (!paceSecs || !isFinite(paceSecs) || paceSecs <= 0 || paceSecs > 1200) return "--:--";
  const mins = Math.floor(paceSecs / 60);
  const secs = Math.floor(paceSecs % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// duracao em segundos -> "HH:MM:SS" ou "MM:SS"
export function formatTime(totalSecs) {
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// metros -> "X,XXX km"
export function formatDistance(meters) {
  return (meters / 1000).toFixed(3).replace('.', ',');
}
