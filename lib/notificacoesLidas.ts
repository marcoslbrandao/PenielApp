import AsyncStorage from '@react-native-async-storage/async-storage';

// Controle de "lido"/"removido" do sininho de notificações — 100% local
// (AsyncStorage), sem precisar de tabela nova no Supabase. Os avisos em si
// continuam sendo os mesmos pra todo mundo (é um mural comum), então
// "remover" aqui não apaga o aviso do banco — só esconde ele da lista
// desse aparelho específico. Se o usuário trocar de aparelho ou reinstalar
// o app, o contador zera e os avisos removidos voltam a aparecer.
const LAST_SEEN_KEY = '@peniel_notif_last_seen';
const DISMISSED_KEY = '@peniel_notif_dismissed';
const MAX_DISMISSED = 200; // evita a lista de ids crescer pra sempre

export async function getUltimaVisita(): Promise<string | null> {
  return AsyncStorage.getItem(LAST_SEEN_KEY);
}

export async function marcarComoVistoAgora(): Promise<void> {
  await AsyncStorage.setItem(LAST_SEEN_KEY, new Date().toISOString());
}

export async function getIdsDispensados(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(DISMISSED_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function dispensarAviso(id: string): Promise<string[]> {
  const atuais = await getIdsDispensados();
  if (atuais.includes(id)) return atuais;
  const novos = [id, ...atuais].slice(0, MAX_DISMISSED);
  await AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify(novos));
  return novos;
}
