import React from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import BandaScreen from './BandaScreen';
import MembrosScreen from './MembrosScreen';
import AdminScreen from './AdminScreen';
import GruposScreen from './GruposScreen';
import EscalasScreen from './EscalasScreen';
import { useAcesso } from '../lib/acesso';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/useAuth';

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg: '#0D0F1A',
  surface: '#161822',
  border: '#252730',
  primary: '#7C4DFF',
  accent: '#F5C842',
  text: '#F1F1F3',
  textMuted: '#8A8A96',
};

// ─── Placeholder screens ──────────────────────────────────────────────────────

const ph = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  title: { fontSize: 20, fontWeight: '800', color: C.text },
  sub: { fontSize: 14, color: C.textMuted },
});
const Tab = createBottomTabNavigator();

export default function AreaMembroScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { ehMembro, ehAdmin, carregando } = useAcesso();
  const { user } = useAuth();

  // Quem lidera pelo menos UMA área de escala (banda, som, recepção…) precisa
  // da aba Admin pra montar a escala e o time daquela área — e só disso: a
  // própria AdminScreen esconde as outras abas de quem não é admin. É um eixo
  // de liderança separado do líder de grupo; a mesma pessoa pode ser os dois.
  const [lideraAreaEscala, setLideraAreaEscala] = React.useState(false);
  React.useEffect(() => {
    if (!user) { setLideraAreaEscala(false); return; }
    supabase.from('escala_area_lideres').select('area_id').eq('profile_id', user.id)
      .then(({ data }) => setLideraAreaEscala((data ?? []).length > 0));
  }, [user?.id]);

  const mostrarAdmin = ehAdmin || lideraAreaEscala;

  // Carregando o papel
  if (carregando) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="flame" size={40} color={C.accent} />
      </View>
    );
  }

  // Rede de segurança: esta aba nem é montada pra quem não é membro (ver
  // App.tsx). Se alguém chegar aqui mesmo assim — deep link, sessão trocada
  // com a aba aberta — o tom é de convite, não de porta trancada.
  if (!ehMembro) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(245,200,66,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <Ionicons name="key-outline" size={34} color={C.accent} />
          </View>
          <Text style={{ fontSize: 21, fontWeight: '800', color: C.text, marginBottom: 10, textAlign: 'center' }}>
            {t('ativarMembro.titulo')}
          </Text>
          <Text style={{ fontSize: 14, color: C.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 26 }}>
            {t('ativarMembro.explicacao')}
          </Text>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.primary, borderRadius: 14, paddingVertical: 15, paddingHorizontal: 26 }}
            onPress={() => navigation.navigate('AtivarMembro')}
            activeOpacity={0.85}
          >
            <Ionicons name="shield-checkmark-outline" size={18} color="#fff" />
            <Text style={{ fontSize: 15.5, fontWeight: '700', color: '#fff' }}>{t('ativarMembro.ativar')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Membro, líder ou admin → área do membro
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: C.surface,
            borderTopColor: C.border,
            borderTopWidth: 1,
          },
          tabBarActiveTintColor: C.primary,
          tabBarInactiveTintColor: C.textMuted,
          tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        }}
      >
        <Tab.Screen
          name="Grupos"
          component={GruposScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="people-circle-outline" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Escalas"
          component={EscalasScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="calendar-outline" size={size} color={color} />
            ),
          }}
        />
        {/* Admin = conteúdo público da igreja (avisos, devocionais, mensagens
            e shorts que aparecem na Home e na Mídia). Membro comum não tem o
            que fazer aqui, e antes batia numa tela de "acesso negado" dentro
            de uma aba que o app tinha mostrado pra ele. */}
        {mostrarAdmin && (
          <Tab.Screen
            name="Admin"
            component={AdminScreen}
            options={{
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="shield-outline" size={size} color={color} />
              ),
            }}
          />
        )}
        <Tab.Screen
          name="Banda"
          component={BandaScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="musical-notes-outline" size={size} color={color} />
            ),
          }}
        />
        {/* Diretório da igreja: telefone, endereço, data de nascimento e
            observações internas da liderança. Só admin — nem líder de grupo.
            Pra montar o grupo dele, o líder tem uma busca reduzida (só nome)
            dentro da aba Grupos. */}
        {ehAdmin && (
          <Tab.Screen
            name="Membros"
            component={MembrosScreen}
            options={{
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="people-outline" size={size} color={color} />
              ),
            }}
          />
        )}
      </Tab.Navigator>
    </View>
  );
}



