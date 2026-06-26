import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { formatDistance, formatTime, formatPace } from '../utils/formatters';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function HistoryPage() {
  const sessoes = useLiveQuery(() => db.sessoes.orderBy('data').reverse().toArray());

  if (!sessoes) return <div className="p-4 text-center mt-10">Carregando...</div>;

  // Estatísticas Resumo
  const totalKm = sessoes.reduce((acc, curr) => acc + curr.distancia, 0) / 1000;
  const totalTreinos = sessoes.length;
  const totalCalorias = sessoes.reduce((acc, curr) => acc + (curr.calorias || 0), 0);

  // Últimos 7 treinos (ordenados do mais antigo pro mais novo para o eixo X do gráfico)
  const ultimosSete = [...sessoes].slice(0, 7).reverse();

  const chartData = ultimosSete.map((s) => {
    return {
      date: new Date(s.data).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }),
      paceRaw: s.paceMedio,
      pace: parseFloat((s.paceMedio / 60).toFixed(2)),
      distancia: parseFloat((s.distancia / 1000).toFixed(2))
    };
  });

  const CustomPaceTooltip = ({ active, payload, label }) => {
      if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 dark:bg-gray-800 text-white p-3 rounded-xl shadow-xl text-sm border dark:border-gray-700">
          <p className="font-bold mb-1 opacity-80">{label}</p>
          <p className="font-bold text-orange-400">Pace: {formatPace(payload[0].payload.paceRaw)}</p>
        </div>
      );
    }
    return null;
  };

  const CustomDistTooltip = ({ active, payload, label }) => {
      if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 dark:bg-gray-800 text-white p-3 rounded-xl shadow-xl text-sm border dark:border-gray-700">
          <p className="font-bold mb-1 opacity-80">{label}</p>
          <p className="font-bold text-orange-400">Volume: {payload[0].value} km</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 transition-colors duration-300">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Meu Progresso</h1>
      
      {sessoes.length === 0 ? (
        <p className="text-gray-500 text-center mt-10">Você ainda não tem treinos registrados.</p>
      ) : (
        <>
          {/* Cards de Resumo */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 rounded-2xl shadow-sm transition-colors duration-300">
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Distância</p>
              <p className="text-2xl font-black text-gray-900 dark:text-gray-100">{totalKm.toFixed(1)} <span className="text-sm font-medium text-gray-500 dark:text-gray-400">km</span></p>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 rounded-2xl shadow-sm transition-colors duration-300">
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Treinos</p>
              <p className="text-2xl font-black text-gray-900 dark:text-gray-100">{totalTreinos}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 rounded-2xl shadow-sm transition-colors duration-300">
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Calorias</p>
              <p className="text-2xl font-black text-gray-900 dark:text-gray-100">{totalCalorias} <span className="text-sm font-medium text-gray-500 dark:text-gray-400">kcal</span></p>
            </div>
          </div>

          {/* Gráfico de Pace */}
          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6 transition-colors duration-300">
            <h2 className="font-bold text-gray-800 dark:text-gray-100 mb-4">Evolução de Ritmo (Pace)</h2>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} dy={10} />
                  <YAxis domain={['auto', 'auto']} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} reversed={true} />
                  <Tooltip content={<CustomPaceTooltip />} cursor={{ stroke: '#f97316', strokeWidth: 1, strokeDasharray: '3 3' }} />
                  <Line type="monotone" dataKey="pace" stroke="#f97316" strokeWidth={4} dot={{ r: 4, fill: '#f97316', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico de Volume */}
          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-8 transition-colors duration-300">
            <h2 className="font-bold text-gray-800 dark:text-gray-100 mb-4">Volume Diário</h2>
            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <Tooltip content={<CustomDistTooltip />} cursor={{ fill: '#fff7ed' }} />
                  <Bar dataKey="distancia" fill="#fbd38d" radius={[4, 4, 0, 0]} activeBar={{ fill: '#f97316' }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Lista do Histórico */}
          <h2 className="font-bold text-xl text-gray-900 dark:text-gray-100 mb-4">Últimos Treinos</h2>
          <div className="space-y-4 pb-8">
            {sessoes.map(sessao => (
              <div key={sessao.id} className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col hover:border-orange-200 dark:hover:border-orange-500/50 transition-colors duration-300">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-bold text-gray-400 dark:text-gray-500 capitalize">
                    {new Date(sessao.data).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}
                  </span>
                  <span className="bg-orange-50 dark:bg-orange-900/30 text-[var(--color-primary)] text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wider">{sessao.planoRef}</span>
                </div>
                <div className="flex justify-between items-end">
                  {sessao.planoRef?.includes('Força') ? (
                    <>
                      <div>
                        <p className="text-2xl font-black text-gray-800 dark:text-gray-100 tracking-tighter leading-none mt-2">Cross-Training</p>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">Fortalecimento Muscular</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-800 dark:text-gray-100 leading-none mb-1">{formatTime(sessao.duracao)}</p>
                        <p className="text-sm font-medium text-[var(--color-primary)]">{sessao.calorias || 0} kcal</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <p className="text-3xl font-black text-gray-900 dark:text-gray-100 tracking-tighter leading-none">{formatDistance(sessao.distancia)} <span className="text-sm font-medium text-gray-500 dark:text-gray-400 tracking-normal">km</span></p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-800 dark:text-gray-100 leading-none mb-1">{formatTime(sessao.duracao)}</p>
                        <p className="text-sm font-medium text-[var(--color-primary)]">Pace {formatPace(sessao.paceMedio)}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
