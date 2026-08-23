import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { useCampoTraduzido } from '../lib/useTraducao';

// Tela "Devocionais" — lista TODOS os devocionais que o usuário tem acesso:
// os gerais (aparecem também em destaque na Home) e os de grupo (a RLS de
// `devocionais` já filtra automaticamente — só vem o que essa conta pode
// ver, não precisa de nenhum filtro extra aqui).
type Devocional = {
  id: string;
  titulo: string;
  versiculo: string;
  referencia: string;
  texto: string;
  data: string;
  grupo: string | null;
};

const GRUPO_LABEL_KEY: Record<string, string> = {
  homens: 'grupos.tabHomens',
  mulheres: 'grupos.tabMulheres',
  jovens: 'grupos.tabAlive',
  estudo_biblico: 'grupos.tabEstudoBiblico',
};

function DevocionalItem({ dev, aberto, onToggle }: { dev: Devocional; aberto: boolean; onToggle: () => void }) {
  const { t, i18n } = useTranslation();
  const titulo = useCampoTraduzido(dev.titulo, 'devocionais', dev.id, 'titulo');
  const versiculo = useCampoTraduzido(dev.versiculo, 'devocionais', dev.id, 'versiculo');
  const referencia = useCampoTraduzido(dev.referencia, 'devocionais', dev.id, 'referencia');
  const texto = useCampoTraduzido(dev.texto, 'devocionais', dev.id, 'texto');
  const grupoLabel = dev.grupo ? t(GRUPO_LABEL_KEY[dev.grupo] ?? dev.grupo) : t('devocionais.geral');
  const locale = i18n.language === 'pt' ? 'pt-BR' : i18n.language;
  const dataLabel = new Date(dev.data).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={onToggle}>
      <View style={styles.cardHeader}>
        <View style={styles.icone}>
          <Ionicons name="book" size={16} color="#F5C842" />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.metaRow}>
            <Text style={styles.badge}>{grupoLabel}</Text>
            <Text style={styles.data}>{dataLabel}</Text>
          </View>
          <Text style={styles.titulo}>{titulo}</Text>
        </View>
        <Ionicons name={aberto ? 'chevron-up' : 'chevron-down'} size={18} color="rgba(255,255,255,0.4)" />
      </View>
      {aberto && (
        <View style={styles.body}>
          <Text style={styles.versiculo}>"{versiculo}"</Text>
          <Text style={styles.referencia}>{referencia}</Text>
          <Text style={styles.texto}>{texto}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function DevocionaisScreen({ navigation }: { navigation?: any }) {
  const { t } = useTranslation();
  const [devocionais, setDevocionais] = useState<Devocional[]>([]);
  const [loading, setLoading] = useState(true);
  const [abertoId, setAbertoId] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('devocionais')
      .select('id, titulo, versiculo, referencia, texto, data, grupo')
      .order('data', { ascending: false })
      .then(({ data }) => {
        setDevocionais((data as Devocional[]) ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitulo}>{t('devocionais.titulo')}</Text>
        {navigation && (
          <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#F5C842" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {devocionais.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="book-outline" size={40} color="rgba(255,255,255,0.25)" />
              <Text style={styles.emptyTexto}>{t('devocionais.nenhumDevocional')}</Text>
            </View>
          ) : (
            devocionais.map(dev => (
              <DevocionalItem
                key={dev.id}
                dev={dev}
                aberto={abertoId === dev.id}
                onToggle={() => setAbertoId(abertoId === dev.id ? null : dev.id)}
              />
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0E0B22' },
  header: {
    backgroundColor: '#1A1740', paddingTop: 55, paddingBottom: 16, paddingHorizontal: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  headerTitulo: { fontSize: 18, fontWeight: '700', color: '#fff' },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: 18, paddingBottom: 40 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  emptyTexto: { color: 'rgba(255,255,255,0.5)', fontSize: 14, textAlign: 'center' },
  card: {
    backgroundColor: '#241D5C', borderRadius: 16, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: 'rgba(245,200,66,0.2)',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icone: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(245,200,66,0.15)', alignItems: 'center', justifyContent: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { fontSize: 10, fontWeight: '700', color: '#F5C842', textTransform: 'uppercase', letterSpacing: 0.5 },
  data: { fontSize: 10, color: 'rgba(255,255,255,0.4)' },
  titulo: { fontSize: 14, fontWeight: '700', color: '#fff', marginTop: 2 },
  body: { marginTop: 14, paddingTop: 14, borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.1)' },
  versiculo: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontStyle: 'italic', lineHeight: 20 },
  referencia: { fontSize: 11, fontWeight: '700', color: '#F5C842', marginTop: 6 },
  texto: { fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 20, marginTop: 10 },
});
