import Dexie from 'dexie';

export const db = new Dexie('RunTrainerDB');

// Declarando o schema do banco (apenas os índices que queremos buscar)
db.version(1).stores({
  perfil: 'id', // Geralmente teremos apenas um registro (id=1)
  sessoes: '++id, data, planoRef', // ++ indica auto-incremento
  planos: 'id, distancia, nivel' // O id pode ser a string (ex: '5k-iniciante')
});

// Populando valores padrão se o banco estiver vazio (opcional/útil para primeiro setup)
db.on('populate', async () => {
  await db.perfil.add({
    id: 1,
    nome: '',
    idade: null,
    peso: null,
    altura: null,
    sexo: '',
    distanciaAlvo: '',
    nivel: '',
    dataInicioPlano: null,
    vozAtivada: true,
    vozVolume: 1.0,
    alertaPace: true,
    intervaloAlerta: 1000,
    unidade: 'metric'
  });
});
