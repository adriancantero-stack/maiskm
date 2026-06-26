import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Info, X } from 'lucide-react';
import { db } from '../db/database';

export function Onboarding() {
  const navigate = useNavigate();
  const [showLevelHelp, setShowLevelHelp] = useState(false);
  const perfil = useLiveQuery(() => db.perfil.get(1).then(p => p || null));

  const [formData, setFormData] = useState({
    nome: '',
    idade: '',
    peso: '',
    altura: '',
    sexo: 'M',
    distanciaAlvo: '5km',
    nivel: ''
  });

  useEffect(() => {
    // Se já tem nome e data de início, já fez onboarding
    if (perfil?.nome && perfil?.dataInicioPlano) {
      navigate('/home');
    }
  }, [perfil, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    await db.perfil.put({
      ...perfil,
      id: 1,
      ...formData,
      idade: Number(formData.idade),
      peso: Number(formData.peso),
      altura: Number(formData.altura),
      dataInicioPlano: new Date().toISOString()
    });
    navigate('/home');
  };

  if (perfil === undefined) return <div className="p-4">Carregando...</div>;

  return (
    <div className="flex-1 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-6 flex flex-col transition-colors duration-300">
      <div className="flex-1 overflow-y-auto pb-6">
        <div className="flex justify-center mb-6 mt-4">
          <img src="/logo.png" alt="MaisKM Logo" className="h-24 w-auto rounded-2xl shadow-sm transition-all duration-300" />
        </div>
        
        <p className="text-gray-600 dark:text-gray-400 mb-8 text-center font-medium">Configure seu perfil para personalizar seus treinos.</p>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Seu Nome</label>
            <input required type="text" name="nome" value={formData.nome} onChange={handleChange} className="w-full border dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800 focus:outline-primary transition-colors" placeholder="Como quer ser chamado?" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Idade</label>
              <input required type="number" name="idade" value={formData.idade} onChange={handleChange} className="w-full border dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800 transition-colors" placeholder="Anos" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Sexo</label>
              <select name="sexo" value={formData.sexo} onChange={handleChange} className="w-full border dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800 transition-colors">
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
                <option value="O">Outro</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Peso (kg)</label>
              <input required type="number" step="0.1" name="peso" value={formData.peso} onChange={handleChange} className="w-full border dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800 transition-colors" placeholder="Ex: 75.5" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Altura (cm)</label>
              <input required type="number" name="altura" value={formData.altura} onChange={handleChange} className="w-full border dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800 transition-colors" placeholder="Ex: 175" />
            </div>
          </div>

          <div className="pt-4 border-t dark:border-gray-800 mt-6">
            <h2 className="text-xl font-bold mb-4">Seu Objetivo</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Distância Alvo</label>
                <select name="distanciaAlvo" value={formData.distanciaAlvo} onChange={handleChange} className="w-full border dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800 transition-colors">
                  <option value="5km">5 km</option>
                  <option value="10km">10 km</option>
                  <option value="21km">Meia-maratona (21km)</option>
                  <option value="42km">Maratona (42km)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Seu Nível Atual</label>
                <button 
                  type="button" 
                  onClick={() => setShowLevelHelp(true)} 
                  className={`w-full border rounded-lg p-4 text-left flex justify-between items-center transition-colors ${!formData.nivel ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-500/30 text-[var(--color-primary)] font-bold shadow-inner' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}
                >
                  <span>
                    {!formData.nivel 
                      ? '⚠️ Toque para definir seu nível' 
                      : formData.nivel === 'iniciante' ? 'Iniciante (Run-Walk)' 
                      : formData.nivel === 'intermediario' ? 'Intermediário (Base)' 
                      : 'Avançado (Performance)'}
                  </span>
                  <Info size={20} className={!formData.nivel ? 'animate-pulse' : 'text-gray-400 dark:text-gray-500'} />
                </button>
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={!formData.nivel}
            className={`w-full mt-8 text-white font-bold py-4 rounded-xl shadow-lg transition-all ${!formData.nivel ? 'bg-gray-400 cursor-not-allowed opacity-70' : 'bg-[var(--color-primary)] active:scale-95'}`}
          >
            {formData.nivel ? 'Começar Plano' : 'Escolha seu nível primeiro'}
          </button>
        </form>
      </div>

      {/* Modal de Ajuda de Nível */}
      {showLevelHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            <div className="p-6 relative max-h-[80vh] overflow-y-auto">
              <button 
                type="button"
                onClick={() => setShowLevelHelp(false)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 bg-gray-50 dark:bg-gray-700 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
              
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4 mt-2">
                <Info size={24} className="text-blue-500" />
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                Como escolher seu nível?
              </h3>
              
              <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300 pb-2">
                <button 
                  type="button"
                  onClick={() => { setFormData({...formData, nivel: 'iniciante'}); setShowLevelHelp(false); }}
                  className="w-full text-left bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 p-4 rounded-xl border border-gray-200 dark:border-gray-700 transition-colors"
                >
                  <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-1 text-base">🏃‍♂️ Sou Iniciante</h4>
                  <p><strong>Não consigo correr 30 min contínuos</strong> sem caminhar. Quero construir o hábito e fôlego.</p>
                </button>
                
                <button 
                  type="button"
                  onClick={() => { setFormData({...formData, nivel: 'intermediario'}); setShowLevelHelp(false); }}
                  className="w-full text-left bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/40 p-4 rounded-xl border border-orange-200 dark:border-orange-500/30 transition-colors"
                >
                  <h4 className="font-bold text-orange-600 dark:text-orange-500 mb-1 text-base">🔥 Sou Intermediário</h4>
                  <p><strong>Já corro 5km ou 30 min sem parar.</strong> A velocidade não importa. Quero aumentar a distância.</p>
                </button>
                
                <button 
                  type="button"
                  onClick={() => { setFormData({...formData, nivel: 'avancado'}); setShowLevelHelp(false); }}
                  className="w-full text-left bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 p-4 rounded-xl border border-red-200 dark:border-red-500/30 transition-colors"
                >
                  <h4 className="font-bold text-red-600 dark:text-red-500 mb-1 text-base">⚡ Sou Avançado</h4>
                  <p>Corro rápido (abaixo de <strong>5:30/km</strong>) e quero focar em bater recordes com treinos complexos.</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
