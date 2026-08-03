import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Modal, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/theme';

type Secao = 'aviso' | 'devocional' | 'short' | 'material';

function paletaGrupoAdmin(isDark: boolean) {
  return isDark ? {
    bg: '#1C1940',
    text: '#F1EFFA',
    textMuted: '#A69FD6',
    border: '#332D5C',
    inputBg: '#241F4D',
    placeholder: '#726A99',
  } : {
    bg: '#FFFFFF',
    text: '#1A1A2E',
    textMuted: '#6B7280',
    border: '#E5E0D8',
    inputBg: '#F7F4EE',
    placeholder: '#9CA3AF',
  };
}
type PaletaGrupoAdmin = ReturnType<typeof paletaGrupoAdmin>;

// Painel de admin de um grupo específico — só pro líder daquele grupo (ou
// admin geral). Publica direto em `avisos` / `devocionais` / `shorts_videos`
// com `grupo` preenchido, então a RLS já garante que só quem foi adicionado
// ao grupo enxerga o que for postado aqui (e o push de aviso vai só pra
// eles também — ver supabase/functions/content-notifications).
export default function GrupoAdminModal({ visible, grupo, grupoNome, cor, onClose, onSaved }: {
  visible: boolean;
  grupo: string;
  grupoNome: string;
  cor: string;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [secao, setSecao] = useState<Secao>('aviso');

  const [avisoTitulo, setAvisoTitulo] = useState('');
  const [avisoTexto, setAvisoTexto] = useState('');
  const [avisoTipo, setAvisoTipo] = useState<'geral' | 'evento' | 'urgente'>('geral');

  const [devTitulo, setDevTitulo] = useState('');
  const [devVersiculo, setDevVersiculo] = useState('');
  const [devReferencia, setDevReferencia] = useState('');
  const [devTexto, setDevTexto] = useState('');

  const [shortTitulo, setShortTitulo] = useState('');
  const [shortUrl, setShortUrl] = useState('');
  const [shortPlataforma, setShortPlataforma] = useState<'youtube' | 'instagram'>('youtube');

  const [materialTitulo, setMaterialTitulo] = useState('');
  const [materialUrl, setMaterialUrl] = useState('');

  const [saving, setSaving] = useState(false);

  const { isDark } = useTheme();
  const C = useMemo(() => paletaGrupoAdmin(isDark), [isDark]);
  const s = useMemo(() => buildStyles(C), [C]);

  useEffect(() => {
    if (!visible) {
      setSecao('aviso');
      setAvisoTitulo(''); setAvisoTexto(''); setAvisoTipo('geral');
      setDevTitulo(''); setDevVersiculo(''); setDevReferencia(''); setDevTexto('');
      setShortTitulo(''); setShortUrl(''); setShortPlataforma('youtube');
      setMaterialTitulo(''); setMaterialUrl('');
    }
  }, [visible]);

  const publicarAviso = async () => {
    if (!avisoTitulo.trim() || !avisoTexto.trim()) { Alert.alert('Atenção', 'Preencha o título e o texto do aviso.'); return; }
    setSaving(true);
    const { error } = await supabase.from('avisos').insert({
      titulo: avisoTitulo.trim(), texto: avisoTexto.trim(), tipo: avisoTipo, data: new Date().toISOString(), grupo,
    });
    setSaving(false);
    if (error) { Alert.alert('Erro', error.message); return; }
    Alert.alert('Enviado', `Notificação publicada só pro grupo ${grupoNome}.`);
    setAvisoTitulo(''); setAvisoTexto('');
    onSaved?.();
  };

  const publicarDevocional = async () => {
    if (!devTitulo.trim() || !devVersiculo.trim() || !devReferencia.trim() || !devTexto.trim()) {
      Alert.alert('Atenção', 'Preencha todos os campos do devocional.'); return;
    }
    setSaving(true);
    const { error } = await supabase.from('devocionais').insert({
      titulo: devTitulo.trim(), versiculo: devVersiculo.trim(), referencia: devReferencia.trim(),
      texto: devTexto.trim(), autor: 'Peniel Church', data: new Date().toISOString(), grupo,
    });
    setSaving(false);
    if (error) { Alert.alert('Erro', error.message); return; }
    Alert.alert('Publicado', `Devocional publicado pro grupo ${grupoNome}.`);
    setDevTitulo(''); setDevVersiculo(''); setDevReferencia(''); setDevTexto('');
    onSaved?.();
  };

  const publicarShort = async () => {
    if (!shortTitulo.trim() || !shortUrl.trim()) { Alert.alert('Atenção', 'Preencha o título e o link do vídeo.'); return; }
    setSaving(true);
    const { error } = await supabase.from('shorts_videos').insert({
      titulo: shortTitulo.trim(), url: shortUrl.trim(), plataforma: shortPlataforma, grupo,
    });
    setSaving(false);
    if (error) { Alert.alert('Erro', error.message); return; }
    Alert.alert('Publicado', `Short publicado pro grupo ${grupoNome}.`);
    setShortTitulo(''); setShortUrl('');
    onSaved?.();
  };

  const publicarMaterial = async () => {
    if (!materialTitulo.trim() || !materialUrl.trim()) { Alert.alert('Atenção', 'Preencha o título e o link do material.'); return; }
    setSaving(true);
    const { error } = await supabase.from('grupo_arquivos').insert({
      titulo: materialTitulo.trim(), url: materialUrl.trim(), grupo,
    });
    setSaving(false);
    if (error) { Alert.alert('Erro', error.message); return; }
    Alert.alert('Publicado', `Material publicado pro grupo ${grupoNome}.`);
    setMaterialTitulo(''); setMaterialUrl('');
    onSaved?.();
  };

  const SECOES: { id: Secao; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'aviso', label: 'Aviso', icon: 'megaphone-outline' },
    { id: 'devocional', label: 'Devocional', icon: 'book-outline' },
    { id: 'short', label: 'Short', icon: 'film-outline' },
    { id: 'material', label: 'Material', icon: 'document-text-outline' },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%', maxHeight: '90%' }}>
          <View style={s.sheet}>
            <View style={s.header}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={s.title}>Admin do Grupo</Text>
                <Text style={s.subtitle}>{grupoNome} · só quem está no grupo vê o que você postar aqui</Text>
              </View>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={22} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={s.tabBar}>
              {SECOES.map(sec => (
                <TouchableOpacity
                  key={sec.id}
                  style={[s.tabItem, secao === sec.id && { borderBottomWidth: 2, borderBottomColor: cor }]}
                  onPress={() => setSecao(sec.id)}
                >
                  <Ionicons name={sec.icon} size={16} color={secao === sec.id ? cor : C.textMuted} />
                  <Text style={[s.tabLabel, secao === sec.id && { color: cor, fontWeight: '700' }]}>{sec.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 14 }}>
              {secao === 'aviso' && (
                <>
                  <View style={s.fieldWrap}>
                    <Text style={s.fieldLabel}>Tipo</Text>
                    <View style={s.pillsRow}>
                      {(['geral', 'evento', 'urgente'] as const).map(tp => (
                        <TouchableOpacity key={tp} style={[s.pill, avisoTipo === tp && { backgroundColor: cor + '22', borderColor: cor }]} onPress={() => setAvisoTipo(tp)}>
                          <Text style={[s.pillText, avisoTipo === tp && { color: cor, fontWeight: '700' }]}>
                            {tp === 'geral' ? '📢 Geral' : tp === 'evento' ? '📅 Evento' : '🚨 Urgente'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <Field s={s} C={C} label="Título" value={avisoTitulo} onChangeText={setAvisoTitulo} placeholder="Ex: Encontro de sábado adiado" />
                  <Field s={s} C={C} label="Texto" value={avisoTexto} onChangeText={setAvisoTexto} placeholder="Detalhes do aviso..." multiline height={100} />
                  <Text style={s.hint}>Quem está no grupo {grupoNome} recebe push na hora. Mais ninguém vê esse aviso.</Text>
                  <SaveBtn s={s} cor={cor} saving={saving} onPress={publicarAviso} label="Enviar aviso ao grupo" icon="megaphone-outline" />
                </>
              )}

              {secao === 'devocional' && (
                <>
                  <Field s={s} C={C} label="Título" value={devTitulo} onChangeText={setDevTitulo} placeholder="Ex: Confiando no tempo de Deus" />
                  <Field s={s} C={C} label="Versículo" value={devVersiculo} onChangeText={setDevVersiculo} placeholder='Ex: "Tudo posso naquele que me fortalece."' multiline height={70} />
                  <Field s={s} C={C} label="Referência" value={devReferencia} onChangeText={setDevReferencia} placeholder="Ex: Filipenses 4:13" />
                  <Field s={s} C={C} label="Reflexão" value={devTexto} onChangeText={setDevTexto} placeholder="Escreva a reflexão do devocional..." multiline height={110} />
                  <SaveBtn s={s} cor={cor} saving={saving} onPress={publicarDevocional} label="Publicar devocional" icon="book-outline" />
                </>
              )}

              {secao === 'short' && (
                <>
                  <View style={s.fieldWrap}>
                    <Text style={s.fieldLabel}>Plataforma</Text>
                    <View style={s.pillsRow}>
                      {(['youtube', 'instagram'] as const).map(p => (
                        <TouchableOpacity key={p} style={[s.pill, shortPlataforma === p && { backgroundColor: cor + '22', borderColor: cor }]} onPress={() => setShortPlataforma(p)}>
                          <Text style={[s.pillText, shortPlataforma === p && { color: cor, fontWeight: '700' }]}>
                            {p === 'youtube' ? '▶️ YouTube Shorts' : '📸 Instagram Reels'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <Field s={s} C={C} label="Título" value={shortTitulo} onChangeText={setShortTitulo} placeholder="Ex: 1 minuto de fé" />
                  <Field
                    s={s} C={C}
                    label="Link do vídeo" value={shortUrl} onChangeText={setShortUrl}
                    placeholder={shortPlataforma === 'youtube' ? 'https://youtube.com/shorts/...' : 'https://instagram.com/reel/...'}
                    autoCapitalize="none"
                  />
                  <SaveBtn s={s} cor={cor} saving={saving} onPress={publicarShort} label="Publicar short" icon="film-outline" />
                </>
              )}

              {secao === 'material' && (
                <>
                  <Field s={s} C={C} label="Título" value={materialTitulo} onChangeText={setMaterialTitulo} placeholder="Ex: Apostila da aula 3 (PDF)" />
                  <Field
                    s={s} C={C}
                    label="Link" value={materialUrl} onChangeText={setMaterialUrl}
                    placeholder="Cole aqui o link do PDF (Google Drive, WeTransfer...)"
                    autoCapitalize="none"
                  />
                  <Text style={s.hint}>Sobe o arquivo em qualquer lugar (Drive, WeTransfer etc.) e cola o link de acesso aqui. Só quem está no grupo {grupoNome} consegue ver.</Text>
                  <SaveBtn s={s} cor={cor} saving={saving} onPress={publicarMaterial} label="Publicar material" icon="document-text-outline" />
                </>
              )}

              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function Field({ s, C, label, value, onChangeText, placeholder, multiline, height, autoCapitalize }: {
  s: ReturnType<typeof buildStyles>; C: PaletaGrupoAdmin;
  label: string; value: string; onChangeText: (t: string) => void; placeholder: string;
  multiline?: boolean; height?: number; autoCapitalize?: 'none' | 'sentences';
}) {
  return (
    <View style={s.fieldWrap}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={[s.fieldInput, multiline ? { height, textAlignVertical: 'top', paddingTop: 10 } : null]}
        placeholder={placeholder} placeholderTextColor={C.placeholder}
        value={value} onChangeText={onChangeText} multiline={multiline} autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

function SaveBtn({ s, cor, saving, onPress, label, icon }: {
  s: ReturnType<typeof buildStyles>; cor: string; saving: boolean; onPress: () => void; label: string; icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <TouchableOpacity style={[s.saveBtn, { backgroundColor: cor }, saving && { opacity: 0.7 }]} onPress={onPress} disabled={saving}>
      {saving ? <ActivityIndicator color="#fff" /> : (
        <><Ionicons name={icon} size={18} color="#fff" /><Text style={s.saveBtnText}>{label}</Text></>
      )}
    </TouchableOpacity>
  );
}

function buildStyles(C: PaletaGrupoAdmin) { return StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { backgroundColor: C.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 30 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 },
  title: { fontSize: 17, fontWeight: '800', color: C.text },
  subtitle: { fontSize: 11, color: C.textMuted, marginTop: 3 },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.border },
  tabItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10 },
  tabLabel: { fontSize: 12, color: C.textMuted, fontWeight: '500' },
  fieldWrap: { marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: C.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
  fieldInput: { borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: C.text, backgroundColor: C.inputBg },
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { borderWidth: 1, borderColor: C.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: C.inputBg },
  pillText: { fontSize: 12, color: C.textMuted, fontWeight: '600' },
  hint: { fontSize: 11, color: C.textMuted, marginBottom: 10, marginTop: -6, lineHeight: 16 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 14, marginTop: 4 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
}); }
