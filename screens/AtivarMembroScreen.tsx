import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator,
  KeyboardAvoidingView, Platform, StatusBar, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/theme';
import { useAcesso } from '../lib/acesso';
import ContatoModal from '../components/ContatoModal';

// ─── Ativar acesso de membro ─────────────────────────────────────────────────
// Substitui a antiga tela "Acesso Restrito", que era a PRIMEIRA coisa que um
// visitante via ao tocar na aba Membros. Agora a aba nem aparece pra quem não
// é membro, e esta tela só é aberta de propósito — a partir do card do Perfil.
// Por isso o tom mudou: não é mais um aviso de porta trancada, é um convite.
//
// Também segue o tema do app (claro/escuro). A tela antiga era escura fixa,
// o que destoava do Perfil claro logo antes dela.
function paletaAtivar(isDark: boolean) {
  return isDark ? {
    bg: '#0E0B22', surface: '#1C1940', surfaceAlt: '#241F4D', border: '#332D5C',
    primary: '#8F79FF', accent: '#F5C842', text: '#F1EFFA', textMuted: '#A6A0C7',
    textDim: '#726A99', danger: '#FF6B6B', success: '#4ADE80',
  } : {
    bg: '#F7F4EE', surface: '#FFFFFF', surfaceAlt: '#F0EDE8', border: '#E5E0D8',
    primary: '#7B61FF', accent: '#C8960A', text: '#1A1A2E', textMuted: '#6B7280',
    textDim: '#9CA3AF', danger: '#C0392B', success: '#27AE60',
  };
}
type PaletaAtivar = ReturnType<typeof paletaAtivar>;

export default function AtivarMembroScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { isDark } = useTheme();
  const C = useMemo(() => paletaAtivar(isDark), [isDark]);
  const s = useMemo(() => buildStyles(C), [C]);
  const { definirPapel, recarregar } = useAcesso();

  const [codigo, setCodigo] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);
  const [contatoVisivel, setContatoVisivel] = useState(false);

  const ativar = async () => {
    if (!codigo.trim()) { setErro(t('ativarMembro.digiteOCodigo')); return; }
    setCarregando(true); setErro('');
    const { data, error } = await supabase.rpc('use_invite_code', {
      p_code: codigo.trim().toUpperCase(),
    });
    setCarregando(false);
    if (error || !data?.success) {
      setErro(data?.error ?? t('ativarMembro.codigoInvalido'));
      return;
    }
    // Atualiza a UI na hora (a aba Membros aparece imediatamente) e confirma
    // com o servidor logo em seguida, caso o papel concedido não seja 'membro'
    // (um convite de líder, por exemplo).
    setSucesso(true);
    definirPapel('membro');
    recarregar();
  };

  // ── Sucesso ────────────────────────────────────────────────────────────────
  if (sucesso) {
    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={s.centro}>
          <View style={[s.icone, { backgroundColor: C.success + '22' }]}>
            <Ionicons name="checkmark-circle" size={44} color={C.success} />
          </View>
          <Text style={s.titulo}>{t('ativarMembro.sucessoTitulo')}</Text>
          <Text style={s.subtitulo}>{t('ativarMembro.sucessoTexto')}</Text>
          <TouchableOpacity style={s.botao} onPress={() => navigation.goBack()} activeOpacity={0.85}>
            <Text style={s.botaoTexto}>{t('ativarMembro.sucessoBotao')}</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Formulário ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <View style={s.cabecalho}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.fechar} hitSlop={10}>
          <Ionicons name="close" size={24} color={C.textMuted} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={[s.icone, { backgroundColor: C.accent + '22' }]}>
            <Ionicons name="key-outline" size={38} color={C.accent} />
          </View>

          <Text style={s.titulo}>{t('ativarMembro.titulo')}</Text>
          <Text style={s.subtitulo}>{t('ativarMembro.explicacao')}</Text>

          <View style={s.campoWrap}>
            <View style={[s.campo, !!erro && { borderColor: C.danger }]}>
              <Ionicons name="ticket-outline" size={18} color={C.textMuted} style={{ marginRight: 10 }} />
              <TextInput
                style={s.input}
                placeholder="PENIEL-2024-XX"
                placeholderTextColor={C.textDim}
                value={codigo}
                onChangeText={v => { setCodigo(v.toUpperCase()); setErro(''); }}
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={ativar}
              />
            </View>
            {!!erro && (
              <View style={s.erroLinha}>
                <Ionicons name="alert-circle-outline" size={14} color={C.danger} />
                <Text style={s.erroTexto}>{erro}</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[s.botao, carregando && { opacity: 0.7 }]}
            onPress={ativar}
            disabled={carregando}
            activeOpacity={0.85}
          >
            {carregando ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="shield-checkmark-outline" size={18} color="#fff" />
                <Text style={s.botaoTexto}>{t('ativarMembro.ativar')}</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Saída para quem NÃO tem código — sem isso, a tela é um beco sem
              saída: a pessoa lê "peça ao seu líder" e não tem como pedir. */}
          <View style={s.semCodigo}>
            <Text style={s.semCodigoTitulo}>{t('ativarMembro.semCodigoTitulo')}</Text>
            <Text style={s.semCodigoTexto}>{t('ativarMembro.semCodigoTexto')}</Text>
            <TouchableOpacity style={s.botaoSecundario} onPress={() => setContatoVisivel(true)} activeOpacity={0.8}>
              <Ionicons name="chatbubble-ellipses-outline" size={17} color={C.primary} />
              <Text style={s.botaoSecundarioTexto}>{t('ativarMembro.solicitarAcesso')}</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.rodape}>{t('ativarMembro.rodape')}</Text>
        </ScrollView>
      </KeyboardAvoidingView>

      <ContatoModal
        visible={contatoVisivel}
        cor={C.primary}
        grupoNome={t('ativarMembro.titulo')}
        mensagemInicial={t('ativarMembro.mensagemSolicitacao')}
        onClose={() => setContatoVisivel(false)}
      />
    </SafeAreaView>
  );
}

function buildStyles(C: PaletaAtivar) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    cabecalho: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 8 },
    fechar: { padding: 6 },
    scroll: { paddingHorizontal: 28, paddingBottom: 40, alignItems: 'center' },
    centro: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
    icone: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', marginTop: 12, marginBottom: 20 },
    titulo: { fontSize: 23, fontWeight: '800', color: C.text, textAlign: 'center', marginBottom: 10 },
    subtitulo: { fontSize: 14.5, color: C.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
    campoWrap: { width: '100%', marginBottom: 14 },
    campo: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, height: 54 },
    input: { flex: 1, fontSize: 16, color: C.text, letterSpacing: 2, fontWeight: '700' },
    erroLinha: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
    erroTexto: { fontSize: 12.5, color: C.danger, flex: 1 },
    botao: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.primary, borderRadius: 14, paddingVertical: 15, width: '100%', marginTop: 4 },
    botaoTexto: { fontSize: 16, fontWeight: '700', color: '#fff' },
    semCodigo: { width: '100%', backgroundColor: C.surfaceAlt, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 18, marginTop: 30, alignItems: 'center' },
    semCodigoTitulo: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 6, textAlign: 'center' },
    semCodigoTexto: { fontSize: 13.5, color: C.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 14 },
    botaoSecundario: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.primary, paddingVertical: 12, paddingHorizontal: 18 },
    botaoSecundarioTexto: { fontSize: 14.5, fontWeight: '700', color: C.primary },
    rodape: { fontSize: 12.5, color: C.textDim, textAlign: 'center', marginTop: 24, lineHeight: 19 },
  });
}
