import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import type { EventSubscription } from 'expo-modules-core';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import i18n from 'i18next';

// Configura como as notificações aparecem quando o app está aberto.
// No SDK 54 o `shouldShowAlert` foi depreciado e substituído por dois campos
// obrigatórios: `shouldShowBanner` (o balão que desce no topo) e
// `shouldShowList` (a entrada na central de notificações). Sem eles a
// notificação chegava mas não aparecia com o app em primeiro plano.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function useNotifications(userId: string | undefined) {
  const notificationListener = useRef<EventSubscription | null>(null);
  const responseListener = useRef<EventSubscription | null>(null);

  useEffect(() => {
    if (!userId) return;

    registerForPushNotifications(userId);

    // Escuta notificações recebidas com app aberto
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notificação recebida:', notification);
    });

    // Escuta quando usuário toca na notificação
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notificação tocada:', response);
    });

    return () => {
      // `Notifications.removeNotificationSubscription()` foi REMOVIDA do
      // expo-notifications no SDK 54. Chamá-la lançava TypeError toda vez que
      // o efeito era limpo (logout, troca de conta, unmount). A API atual é
      // chamar `.remove()` na própria subscription devolvida pelo listener.
      notificationListener.current?.remove();
      responseListener.current?.remove();
      notificationListener.current = null;
      responseListener.current = null;
    };
  }, [userId]);
}

async function registerForPushNotifications(userId: string) {
  if (!Device.isDevice) {
    console.log('Push notifications só funcionam em dispositivo físico.');
    return;
  }

  // Pede permissão
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Permissão de notificação negada.');
    return;
  }

  // Configuração Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  // Pega o token Expo Push
  const projectId = 'f53e9e07-9556-4ea8-80e0-da4487b38e56';

  if (!projectId) {
    console.log('projectId não encontrado — configure em app.json');
    return;
  }

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!token) return;

    // Salva o token no Supabase. onConflict é o token (o aparelho), não o
    // user_id — assim, se essa pessoa logar com outra conta no mesmo
    // aparelho depois, a MESMA linha é atualizada pro novo user_id em vez
    // de criar uma linha nova (o que causava notificação duplicada: um
    // aparelho registrado em várias contas recebia o mesmo push várias
    // vezes). Ver migração 20260823120000_push_tokens_unico_por_token.sql.
    // O idioma vai junto pra que a notificação do versículo do dia (mandada
    // pelo servidor às 7h do Reino Unido) saia na língua de cada aparelho.
    await supabase.from('push_tokens').upsert(
      { user_id: userId, token, idioma: i18n.language?.slice(0, 2) ?? 'pt' },
      { onConflict: 'token' }
    );

    console.log('Push token registrado:', token);
  } catch (err) {
    console.log('Erro ao obter push token:', err);
  }
}