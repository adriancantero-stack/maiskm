import { useCallback, useEffect, useRef } from 'react';

export function useVoice(settings) {
  const synth = window.speechSynthesis;
  const isEnabled = settings?.vozAtivada ?? true;
  const volume = settings?.vozVolume ?? 1.0;

  // Garantir que carregamos as vozes. (No Chrome, pode demorar um pouco)
  useEffect(() => {
    const loadVoices = () => synth.getVoices();
    loadVoices();
    if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = loadVoices;
    }
  }, [synth]);

  const speak = useCallback((text) => {
    if (!isEnabled || !synth) return;

    // Cancela o áudio atual se for muito longo e outro mais importante chegar
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.volume = volume;
    utterance.rate = 1.0;
    
    // Tentar selecionar a melhor voz PT-BR feminina de forma consistente
    const voices = synth.getVoices();
    const ptVoice = voices.find(v => v.lang === 'pt-BR' && (v.name.includes('Google') || v.name.includes('Luciana') || v.name.includes('Vitoria') || v.name.includes('Feminino'))) 
      || voices.find(v => v.lang === 'pt-BR') 
      || voices.find(v => v.lang.includes('pt'));
      
    if (ptVoice) {
      utterance.voice = ptVoice;
    }

    synth.speak(utterance);
  }, [synth, isEnabled, volume]);

  return { speak };
}
