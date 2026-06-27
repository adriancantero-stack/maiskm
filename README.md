<div align="center">
  <img src="https://maiskm.com.br/logo.png" alt="MaisKM Logo" width="200" />
  <h1>MaisKM - Seu Treinador de Bolso</h1>
  <p><strong>Um Web App Progressivo (PWA) de corrida focado em iniciar atletas rumo aos seus primeiros 5KM.</strong></p>
</div>

<br />

## 🏃 Sobre o Projeto

O **MaisKM** é um aplicativo web voltado para a comunidade de corredores iniciantes. Desenvolvido para funcionar 100% no navegador (Chrome/Safari), ele utiliza APIs nativas do celular para entregar uma experiência digna de aplicativos nativos de esporte, como Strava e Nike Run Club.

O foco principal do MaisKM é guiar o atleta através de **Planilhas de Treinamento** com áudio integrado, medindo pace, distância e tempo em tempo real, respeitando os períodos de Aquecimento e Desaquecimento.

## ✨ Principais Funcionalidades

- **🎙️ Treinador por Voz (Voice Coach):** Utiliza a API `SpeechSynthesis` para conversar com o atleta. Ele avisa quando mudar as fases (Aquecimento -> Treino -> Desaquecimento), parabeniza nos quilômetros fechados e informa o Pace atual.
- **📍 Rastreamento GPS Preciso:** Consome a `Geolocation API` do navegador de forma ativa, calculando distância realística com a fórmula de Haversine e suavização de pontos para calcular o Pace Médio Móvel (últimos 20 segundos).
- **🛡️ Arquitetura Anti-Crash & Auto-Save:** PWAs no iOS sofrem com congelamento de tela. O MaisKM implementa um **Cronômetro Delta Time (Hora Atômica)** e salva os dados no `localStorage` a cada 5 segundos. Se o navegador travar por falta de memória RAM, o treino é recuperado instantaneamente sem perda de distância!
- **⌚ Fases Inteligentes (Laps):** Semelhante a relógios Garmin/Coros, o cronômetro zera visualmente ao trocar de uma fase de caminhada para corrida, separando perfeitamente o "Pace de Corrida" do "Pace de Caminhada".
- **💾 Histórico Offline:** Todas as corridas são armazenadas no próprio celular usando um banco de dados local (`Dexie.js` / IndexedDB). O app funciona mesmo se o corredor perder o sinal do 4G no meio do parque.

## 🛠️ Tecnologias Utilizadas

- **Frontend:** React + Vite
- **Estilização:** TailwindCSS (v4) + Lucide Icons
- **Armazenamento:** Dexie.js (IndexedDB wrapper para React)
- **APIs Nativas:** Geolocation API, SpeechSynthesis API, WakeLock API
- **Hospedagem:** Vercel (CI/CD Automático)
- **PWA:** vite-plugin-pwa (Web App Manifest, Service Workers)

## 🚀 Como rodar o projeto localmente

### Pré-requisitos
- Node.js (v18 ou superior)
- Git

### Instalação

```bash
# 1. Clone o repositório
git clone https://github.com/adriancantero-stack/maiskm.git

# 2. Entre na pasta
cd run-pwa

# 3. Instale as dependências
npm install

# 4. Inicie o servidor de desenvolvimento
npm run dev
```

> **Atenção:** Para testar os recursos de GPS, seu navegador exigirá que o ambiente local esteja rodando em `localhost` ou `https`. 

## 📞 Contato
Desenvolvido por **CanteroLabs**. 
Acesse online: [maiskm.com.br](https://maiskm.com.br)
