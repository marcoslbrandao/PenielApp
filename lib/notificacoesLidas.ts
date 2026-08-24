import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

// Controle de "lido"/"removido" do sininho de notificações.
//
// "Última visita" (pro contador de não-lidas) continua 100% local — não
// precisa ser por conta, é só uma marca de "já abri o sininho nesse
// aparelho".
//
// "Removido"/"excluído" MUDOU (15ª rodada): antes era só local
// (AsyncStorage) — reinstalar o app ou trocar de aparelho fazia os avisos
// excluídos voltarem a aparecer, o que o Marcos reportou como bug ("deletou
// é pra sempre"). Agora, quem está logado tem a exclusão salva no Supabase
// (tabela `avisos_dispensados`, por user_id) — soma com o que já estava
// local nesse aparelho (pra não "ressuscitar" nada de antes da 15ª rodada)
// e qualquer exclusão nova vai pros dois lugares. Quem não está logado
// (visitante, sem conta) continua só local, que é o único jeito possível
// nesse caso.
const LAST_SEEN_KEY = '@peniel_notif_last_seen';
const DISMISSED_KEY = '@peniel_notif_dismissed';
const MAX_DISMISSED = 200; // evita a lista local de ids crescer pra sempre

export async function getUltimaVisita(): Promise<string | null> {
  return AsyncStorage.getItem(LAST_SEEN_KEY);
}

export async function marcarComoVistoAgora(): Promise<void> {
  await AsyncStorage.setItem(LAST_SEEN_KEY, new Date().toISOString());
}

async function getIdsDispensadosLocal(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(DISMISSED_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function dispensarAvisoLocal(id: string): Promise<string[]> {
  const atuais = await getIdsDispensadosLocal();
  if (atuais.includes(id)) return atuais;
  const novos = [id, ...atuais].slice(0, MAX_DISMISSED);
  await AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify(novos));
  return novos;
}

// userId ausente (visitante sem login) → comportamento antigo, só local.
export async function getIdsDispensados(userId?: string | null): Promise<string[]> {
  const locais = await getIdsDispensadosLocal();
  if (!userId) return locais;
  try {
    const { data, error } = await supabase
      .from('avisos_dispensados')
      .select('aviso_id')
      .eq('user_id', userId);
    if (error) throw error;
    const doServidor = (data ?? []).map((r: any) => r.aviso_id as string);
    return [...new Set([...doServidor, ...locais])];
  } catch {
    // Sem internet ou erro qualquer — não trava a lista, só usa o local.
    return locais;
  }
}

export async function dispensarAviso(id: string, userId?: string | null): Promise<string[]> {
  const novosLocais = await dispensarAvisoLocal(id);
  if (userId) {
    try {
      await supabase.from('avisos_dispensados').upsert(
        { user_id: userId, aviso_id: id },
        { onConflict: 'user_id,aviso_id' }
      );
    } catch {
      // Se falhar (ex.: sem internet), pelo menos o local já salvou —
      // some no rebind seguinte com internet, quando getIdsDispensados
      // buscar de novo e a diferença for reenviada na próxima exclusão.
    }
  }
  return getIdsDispensados(userId);
}
