import { StripeProvider } from '@stripe/stripe-react-native';
import { useEffect } from 'react';
import { Linking } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import HomeScreen from './screens/HomeScreen';
import BibleScreen from './screens/BibleScreen';
import AgendaScreen from './screens/AgendaScreen';
import PerfilScreen from './screens/PerfilScreen';
import MidiaScreen from './screens/MidiaScreen';
import AreaMembroScreen from './screens/AreaMembroScreen';
import OfertaScreen from './screens/OfertaScreen';
import NovaSenhaScreen from './screens/NovaSenhaScreen';
import MeuCadastroScreen from './screens/MeuCadastroScreen';
import DevocionaisScreen from './screens/DevocionaisScreen';
import { supabase } from './lib/supabase';
import { carregarIdiomaSalvo } from './lib/i18n';
import { ThemeProvider, useTheme } from './lib/theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef();

// ─── Deep link de recuperação de senha ────────────────────────────────────────
// O e-mail de "esqueci minha senha" abre penielchurch://reset-password com o
// token no fragmento (#) ou na query (?), dependendo do fluxo do Supabase.
// Aqui a gente estabelece a sessão de recuperação e manda o usuário pra tela
// de definir uma nova senha.
async function handleAuthDeepLink(url: string | null): Promise<boolean> {
  if (!url || !url.includes('reset-password')) return false;
  const [base, fragment] = url.split('#');
  const queryStr = fragment || (base.includes('?') ? base.split('?')[1] : '');
  if (!queryStr) return false;
  const params = new URLSearchParams(queryStr);
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  const token_hash = params.get('token_hash');
  const code = params.get('code');

  if (access_token && refresh_token) {
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    return !error;
  }
  if (token_hash) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type: 'recovery' });
    return !error;
  }
  if (code) {
    // Fluxo PKCE (padrão em projetos Supabase mais novos): o link do email
    // não traz o token pronto, traz um "code" de uma tentativa que precisa
    // ser trocado por uma sessão de verdade. Sem isso, o link abre o app
    // mas nunca navega pra tela de nova senha.
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return !error;
  }
  return false;
}

function MainTabs() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.primary, borderTopColor: 'rgba(255,255,255,0.08)' },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.4)',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Inicio"
        component={HomeScreen}
        options={{
          tabBarLabel: t('tabs.inicio'),
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Biblia"
        component={BibleScreen}
        options={{
          tabBarLabel: t('tabs.biblia'),
          tabBarIcon: ({ color, size }) => <Ionicons name="book-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Agenda"
        component={AgendaScreen}
        options={{
          tabBarLabel: t('tabs.agenda'),
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Midia"
        component={MidiaScreen}
        options={{
          tabBarLabel: t('tabs.midia'),
          tabBarIcon: ({ color, size }) => <Ionicons name="play-circle-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Membros"
        component={AreaMembroScreen}
        options={{
          tabBarLabel: t('tabs.membros'),
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Perfil"
        component={PerfilScreen}
        options={{
          tabBarLabel: t('tabs.perfil'),
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  useEffect(() => { carregarIdiomaSalvo(); }, []);

  useEffect(() => {
    const irParaNovaSenha = async (url: string | null) => {
      const ok = await handleAuthDeepLink(url);
      if (ok && navigationRef.isReady()) {
        navigationRef.navigate('NovaSenha' as never);
      }
    };

    Linking.getInitialURL().then(irParaNovaSenha);
    const subscription = Linking.addEventListener('url', ({ url }) => irParaNovaSenha(url));
    return () => subscription.remove();
  }, []);

  return (
    <StripeProvider
      publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!}
      merchantIdentifier="merchant.org.uk.penielchurch.app"
      urlScheme="penielchurch"
    >
      <SafeAreaProvider>
        <ThemeProvider>
          <NavigationContainer ref={navigationRef}>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="MainTabs" component={MainTabs} />
              <Stack.Screen
                name="Oferta"
                component={OfertaScreen}
                options={{ presentation: 'modal' }}
              />
              <Stack.Screen
                name="MeuCadastro"
                component={MeuCadastroScreen}
                options={{ presentation: 'modal' }}
              />
              <Stack.Screen
                name="Devocionais"
                component={DevocionaisScreen}
                options={{ presentation: 'modal' }}
              />
              <Stack.Screen
                name="NovaSenha"
                component={NovaSenhaScreen}
                options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </ThemeProvider>
      </SafeAreaProvider>
    </StripeProvider>
  );
}