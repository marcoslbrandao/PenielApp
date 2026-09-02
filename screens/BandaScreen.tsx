import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, FlatList, Linking, Alert, KeyboardAvoidingView,
  Platform, StatusBar, Animated, Modal, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/useAuth';

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg: '#0D0D0F', surface: '#18181B', surfaceHigh: '#242429',
  border: '#2A2A30', primary: '#7C4DFF', primaryDim: '#3D2578',
  accent: '#1DB954', accentDim: '#0D5C28', gold: '#F5C842',
  text: '#F1F1F3', textMuted: '#8A8A96', textDim: '#4A4A55', danger: '#FF4D4D',
};

// ─── Types ────────────────────────────────────────────────────────────────────
type Song = {
  id: string; title: string; artist: string;
  song_key: string; bpm: number;
  spotify_id: string; youtube_id: string;
  // Links reais da cifra e da letra, colados pela banda. Opcionais: quando
  // vazios, o app abre a BUSCA do site em vez de um endereço adivinhado.
  cifra_url?: string | null; letra_url?: string | null;
  in_repertoire: boolean;
};

// Alvo de um botão de link: além da URL, guarda se é o link direto salvo pela
// banda (direct: true) ou apenas a busca do site (direct: false) — a interface
// usa isso pra deixar o botão aceso ou apagado.
type LinkTarget = { url: string; direct: boolean };

type CultoSongEntry = {
  song_id: string; song_key: string; bpm: string; order_index: number;
};

type Culto = {
  id: string; label: string; date: string;
  entries: CultoSongEntry[]; escala: EscalaEntry[];
};

type EscalaEntry = { id: string; membro_id: string; instrumento: string };
type BandaMembro = { id: string; profile_id: string; nome: string };

type Ensaio = {
  id: string; label: string; date: string; time: string; local: string; observacao: string;
  entries: CultoSongEntry[]; escala: EscalaEntry[];
};

type ChatMsg = { id: string; author: string; text: string; time: string; mine: boolean };
type Tab = 'hoje' | 'repertorio' | 'cultos' | 'ensaios' | 'chat';

// ─── Link helpers ───────────────────────────────────────────────────
// Regra: o link salvo pela banda SEMPRE ganha. Só quando não existe link salvo
// é que o app cai no plano B — abrir a BUSCA do site já preenchida com
// "título + artista".
//
// Antes, o app tentava adivinhar a URL do Cifra Club e do Letras a partir do
// nome (cifraclub.com.br/hillsong/oceanos/) e isso dava 404 quase sempre: os
// dois sites usam o nome oficial completo no endereço — a URL real de "Oceanos"
// é /hillsong-united/oceanos-onde-meus-pes-podem-falhar/. Nenhum dos dois tem
// API pública, então adivinhar era o único caminho... e o caminho errado.

// Aceita o que a pessoa colou com ou sem https:// e devolve sempre uma URL
// absoluta (ou '' se o campo estiver vazio).
function normalizeUrl(input?: string | null): string {
  const v = (input ?? '').trim();
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v.replace(/^\/+/, '')}`;
}

// "Título Artista" pronto pra entrar numa querystring de busca.
function searchTerms(s: Pick<Song, 'title' | 'artist'>): string {
  return encodeURIComponent(`${(s.title || '').trim()} ${(s.artist || '').trim()}`.trim());
}

function cifraSearchUrl(s: Pick<Song, 'title' | 'artist'>) { return `https://www.cifraclub.com.br/?q=${searchTerms(s)}`; }
function letraSearchUrl(s: Pick<Song, 'title' | 'artist'>) { return `https://www.letras.mus.br/?q=${searchTerms(s)}`; }
function youtubeSearchUrl(s: Pick<Song, 'title' | 'artist'>) { return `https://www.youtube.com/results?search_query=${searchTerms(s)}`; }
function spotifySearchUrl(s: Pick<Song, 'title' | 'artist'>) { return `https://open.spotify.com/search/${searchTerms(s)}`; }

// Um resolvedor por serviço. Todos devolvem uma URL que ABRE — nunca uma
// montada na mão que possa dar 404.
function cifraTarget(s: Song): LinkTarget {
  const saved = normalizeUrl(s.cifra_url);
  return saved ? { url: saved, direct: true } : { url: cifraSearchUrl(s), direct: false };
}
function letraTarget(s: Song): LinkTarget {
  const saved = normalizeUrl(s.letra_url);
  return saved ? { url: saved, direct: true } : { url: letraSearchUrl(s), direct: false };
}
function youtubeTarget(s: Song): LinkTarget {
  return s.youtube_id
    ? { url: `https://www.youtube.com/watch?v=${s.youtube_id}`, direct: true }
    : { url: youtubeSearchUrl(s), direct: false };
}
function spotifyTarget(s: Song): LinkTarget {
  return s.spotify_id
    ? { url: `https://open.spotify.com/track/${s.spotify_id}`, direct: true }
    : { url: spotifySearchUrl(s), direct: false };
}

// Aceita colar o link completo do YouTube (várias variações) ou só o ID —
// extrai o ID de vídeo pra guardar sempre o mesmo formato no banco. Se o texto
// não for reconhecível, devolve '' (melhor não salvar nada do que salvar lixo
// que vira um link quebrado depois).
function extractYoutubeId(input: string): string {
  const v = (input || '').trim();
  if (!v) return '';
  const match = v.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (match) return match[1];
  const bare = v.replace(/[?&#].*$/, '');
  return /^[a-zA-Z0-9_-]{11}$/.test(bare) ? bare : '';
}

// Mesma ideia pro Spotify. O botão "Compartilhar" do Spotify copia algo como
// https://open.spotify.com/track/3vv9phNO5HfDkHvVtJYTNa?si=abc123 — antes esse
// texto era salvo inteiro no campo de ID e o link virava
// open.spotify.com/track/https://open.spotify.com/... (quebrado).
function extractSpotifyId(input: string): string {
  const v = (input || '').trim();
  if (!v) return '';
  const match = v.match(/(?:open\.spotify\.com\/(?:intl-[a-z]{2}\/)?track\/|spotify:track:)([a-zA-Z0-9]{22})/);
  if (match) return match[1];
  const bare = v.replace(/[?&#].*$/, '');
  return /^[a-zA-Z0-9]{22}$/.test(bare) ? bare : '';
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
// Nomes de mês/dia da semana por idioma do app, para exibir a data do culto
// (ex: "Domingo, 12 de Julho" / "Sunday, 12 July") de forma coerente com o
// idioma escolhido em Perfil > Idioma.
const MONTHS_BY_LANG: Record<string, string[]> = {
  pt: ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'],
  en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
  es: ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'],
  fr: ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'],
};
const DAYS_BY_LANG: Record<string, string[]> = {
  pt: ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'],
  en: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
  es: ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'],
  fr: ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'],
};
function formatDateLabel(iso: string, lang: string = 'pt'): string {
  const meses = MONTHS_BY_LANG[lang] ?? MONTHS_BY_LANG.pt;
  const dias = DAYS_BY_LANG[lang] ?? DAYS_BY_LANG.pt;
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return lang === 'en'
    ? `${dias[dt.getDay()]}, ${d} ${meses[m - 1]}`
    : `${dias[dt.getDay()]}, ${d} de ${meses[m - 1]}`;
}
// Dia numérico + mês abreviado (3 letras) a partir de uma data ISO — usado
// no "selo" de data dos cards de ensaio.
function diaEMes(iso: string, lang: string = 'pt'): { dia: string; mes: string } {
  const meses = MONTHS_BY_LANG[lang] ?? MONTHS_BY_LANG.pt;
  const [, m, d] = iso.split('-').map(Number);
  return { dia: String(d).padStart(2, '0'), mes: meses[m - 1].slice(0, 3) };
}
function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// ─── Static mock data (chat — será Supabase futuramente) ─────────────────────
const CHAT_INIT: ChatMsg[] = [
  { id: '1', author: 'Lucas (Guitarra)', text: 'Pessoal, alguém pode mandar a cifra de Oceanos em Lá?', time: '14:32', mine: false },
  { id: '2', author: 'Ana (Teclado)', text: 'Mandei no grupo do WhatsApp também 🎹', time: '14:35', mine: false },
  { id: '3', author: 'Você', text: 'Recebi, obrigado!', time: '14:40', mine: true },
];

// ─── Gate ─────────────────────────────────────────────────────────────────────
function InviteGate({ onUnlock }: { onUnlock: () => void }) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const shake = useRef(new Animated.Value(0)).current;

  const dispararErro = (msg: string) => {
    setError(msg);
    Animated.sequence([
      Animated.timing(shake, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
    setTimeout(() => setError(''), 3000);
  };

  const tryUnlock = async () => {
    if (!code.trim()) return;
    setChecking(true);
    const { data, error: rpcError } = await supabase.rpc('use_banda_code', { p_code: code.trim() });
    setChecking(false);
    if (rpcError) { dispararErro(t('banda.erroValidarCodigo')); return; }
    if (!data?.success) { dispararErro(data?.error ?? t('banda.codigoInvalido')); return; }
    onUnlock();
  };

  return (
    <SafeAreaView style={gate.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={gate.kav}>
        <View style={gate.inner}>
          <View style={gate.iconRing}><Ionicons name="musical-notes" size={36} color={C.primary} /></View>
          <Text style={gate.title}>{t('banda.titulo')}</Text>
          <Text style={gate.subtitle}>{t('banda.subtitulo')}</Text>
          <Text style={gate.body}>{t('banda.gateBody')}</Text>
          <Animated.View style={{ transform: [{ translateX: shake }], width: '100%' }}>
            <TextInput style={[gate.input, !!error && gate.inputError]} placeholder={t('banda.codigoDeAcesso')} placeholderTextColor={C.textDim}
              value={code} onChangeText={t => setCode(t.toUpperCase())} autoCapitalize="characters" returnKeyType="go" onSubmitEditing={tryUnlock} editable={!checking} />
          </Animated.View>
          {!!error && <Text style={gate.errorText}>{error}</Text>}
          <TouchableOpacity style={[gate.btn, checking && { opacity: 0.7 }]} onPress={tryUnlock} activeOpacity={0.85} disabled={checking}>
            {checking ? <ActivityIndicator color="#fff" /> : (
              <><Text style={gate.btnText}>{t('banda.entrar')}</Text><Ionicons name="arrow-forward" size={18} color="#fff" /></>
            )}
          </TouchableOpacity>
          <Text style={gate.hint}>{t('banda.gateHint')}</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const gate = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg }, kav: { flex: 1 },
  inner: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  iconRing: { width: 80, height: 80, borderRadius: 40, backgroundColor: C.primaryDim, borderWidth: 1, borderColor: C.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { fontSize: 26, fontWeight: '800', color: C.text, letterSpacing: 1 },
  subtitle: { fontSize: 13, color: C.primary, fontWeight: '600', marginTop: 4, marginBottom: 20, letterSpacing: 2, textTransform: 'uppercase' },
  body: { fontSize: 14, color: C.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  input: { width: '100%', height: 52, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 18, fontSize: 18, fontWeight: '700', color: C.text, letterSpacing: 4, textAlign: 'center', marginBottom: 8 },
  inputError: { borderColor: C.danger },
  errorText: { fontSize: 13, color: C.danger, marginBottom: 8 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.primary, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12, marginTop: 12 },
  btnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  hint: { fontSize: 12, color: C.textDim, marginTop: 24, textAlign: 'center' },
});

// ─── Modal de Música (criar e editar) ──────────────────────────
// O mesmo modal serve pra cadastrar uma música nova e pra corrigir uma já
// existente — antes só dava pra inserir, então uma música salva com o link
// errado ficava errada pra sempre.
function MusicaModal({ visible, song, onClose, onSaved }: {
  visible: boolean; song: Song | null; onClose: () => void; onSaved: () => void;
}) {
  const { t } = useTranslation();
  const empty = { title: '', artist: '', song_key: '', bpm: '', youtube_id: '', spotify_id: '', cifra_url: '', letra_url: '' };
  const [form, setForm] = useState(empty);
  const [inRepertoire, setInRepertoire] = useState(true);
  const [errors, setErrors] = useState<Partial<typeof empty>>({});
  const [saving, setSaving] = useState(false);
  const isEdit = !!song;

  // Recarrega o formulário toda vez que o modal abre: com os dados da música
  // em edição, ou em branco quando é uma música nova.
  useEffect(() => {
    if (!visible) return;
    if (song) {
      setForm({
        title: song.title ?? '', artist: song.artist ?? '',
        song_key: song.song_key ?? '', bpm: song.bpm != null ? String(song.bpm) : '',
        youtube_id: song.youtube_id ?? '', spotify_id: song.spotify_id ?? '',
        cifra_url: song.cifra_url ?? '', letra_url: song.letra_url ?? '',
      });
      setInRepertoire(!!song.in_repertoire);
    } else {
      setForm({ title: '', artist: '', song_key: '', bpm: '', youtube_id: '', spotify_id: '', cifra_url: '', letra_url: '' });
      setInRepertoire(true);
    }
    setErrors({});
  }, [visible, song]);

  const set = (field: keyof typeof empty) => (val: string) => setForm(prev => ({ ...prev, [field]: val }));

  const handleSave = async () => {
    const e: Partial<typeof empty> = {};
    if (!form.title.trim()) e.title = t('banda.obrigatorio');
    if (!form.artist.trim()) e.artist = t('banda.obrigatorio');
    if (!form.song_key.trim()) e.song_key = t('banda.obrigatorio');
    if (!form.bpm.trim() || isNaN(Number(form.bpm))) e.bpm = t('banda.numeroValido');
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    const payload = {
      title: form.title.trim(), artist: form.artist.trim(),
      song_key: form.song_key.trim().toUpperCase(), bpm: Number(form.bpm),
      spotify_id: extractSpotifyId(form.spotify_id),
      youtube_id: extractYoutubeId(form.youtube_id),
      cifra_url: normalizeUrl(form.cifra_url) || null,
      letra_url: normalizeUrl(form.letra_url) || null,
      in_repertoire: inRepertoire,
    };
    const { error } = song
      ? await supabase.from('songs').update(payload).eq('id', song.id)
      : await supabase.from('songs').insert(payload);
    setSaving(false);
    if (error) { Alert.alert(t('common.erro'), error.message); return; }
    setErrors({});
    onSaved(); onClose();
  };

  // Prévia honesta: mostra exatamente o que cada botão vai abrir com o que
  // está preenchido agora — link direto quando existe, busca do site quando não.
  const previewSong: Song = {
    id: '', title: form.title.trim(), artist: form.artist.trim(),
    song_key: '', bpm: 0,
    spotify_id: extractSpotifyId(form.spotify_id),
    youtube_id: extractYoutubeId(form.youtube_id),
    cifra_url: form.cifra_url, letra_url: form.letra_url, in_repertoire: true,
  };
  const previewRows = (form.title.trim() && form.artist.trim())
    ? [
        { label: 'Cifra Club', target: cifraTarget(previewSong) },
        { label: 'Letras', target: letraTarget(previewSong) },
        { label: 'YouTube', target: youtubeTarget(previewSong) },
        { label: 'Spotify', target: spotifyTarget(previewSong) },
      ]
    : [];

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={nm.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%' }}>
          <View style={nm.sheet}>
            <View style={nm.header}>
              <Text style={nm.title}>{isEdit ? t('banda.editarMusica') : t('banda.novaMusica')}</Text>
              <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={C.textMuted} /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Título */}
              <View style={nm.fieldWrap}>
                <Text style={nm.fieldLabel}>{t('banda.tituloObrigatorio')}</Text>
                <TextInput style={[nm.fieldInput, !!errors.title && nm.fieldInputError]} placeholder={t('banda.nomeDaMusica')} placeholderTextColor={C.textDim} value={form.title} onChangeText={v => { set('title')(v); setErrors(p => ({ ...p, title: undefined })); }} />
                {!!errors.title && <Text style={nm.fieldError}>{errors.title}</Text>}
              </View>
              {/* Artista */}
              <View style={nm.fieldWrap}>
                <Text style={nm.fieldLabel}>{t('banda.artistaObrigatorio')}</Text>
                <TextInput style={[nm.fieldInput, !!errors.artist && nm.fieldInputError]} placeholder={t('banda.artistaOuMinisterio')} placeholderTextColor={C.textDim} value={form.artist} onChangeText={v => { set('artist')(v); setErrors(p => ({ ...p, artist: undefined })); }} />
                {!!errors.artist && <Text style={nm.fieldError}>{errors.artist}</Text>}
              </View>
              {/* Tom + BPM */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <View style={nm.fieldWrap}>
                    <Text style={nm.fieldLabel}>{t('banda.tomObrigatorio')}</Text>
                    <TextInput style={[nm.fieldInput, !!errors.song_key && nm.fieldInputError]} placeholder="Ex: G" placeholderTextColor={C.textDim} value={form.song_key} onChangeText={v => { set('song_key')(v.toUpperCase()); setErrors(p => ({ ...p, song_key: undefined })); }} autoCapitalize="characters" maxLength={3} />
                    {!!errors.song_key && <Text style={nm.fieldError}>{errors.song_key}</Text>}
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={nm.fieldWrap}>
                    <Text style={nm.fieldLabel}>{t('banda.bpmObrigatorio')}</Text>
                    <TextInput style={[nm.fieldInput, !!errors.bpm && nm.fieldInputError]} placeholder="Ex: 72" placeholderTextColor={C.textDim} value={form.bpm} onChangeText={v => { set('bpm')(v); setErrors(p => ({ ...p, bpm: undefined })); }} keyboardType="numeric" maxLength={3} />
                    {!!errors.bpm && <Text style={nm.fieldError}>{errors.bpm}</Text>}
                  </View>
                </View>
              </View>

              {/* ── Links ── */}
              <Text style={nm.groupLabel}>{t('banda.linksDaMusica')}</Text>
              <Text style={nm.groupHint}>{t('banda.linksDicaBusca')}</Text>
              {/* Cifra */}
              <View style={nm.fieldWrap}>
                <Text style={nm.fieldLabel}>{t('banda.linkCifraOpcional')}</Text>
                <TextInput style={nm.fieldInput} placeholder={t('banda.coleLinkCifra')} placeholderTextColor={C.textDim} value={form.cifra_url} onChangeText={set('cifra_url')} autoCorrect={false} autoCapitalize="none" keyboardType="url" />
              </View>
              {/* Letra */}
              <View style={nm.fieldWrap}>
                <Text style={nm.fieldLabel}>{t('banda.linkLetraOpcional')}</Text>
                <TextInput style={nm.fieldInput} placeholder={t('banda.coleLinkLetra')} placeholderTextColor={C.textDim} value={form.letra_url} onChangeText={set('letra_url')} autoCorrect={false} autoCapitalize="none" keyboardType="url" />
              </View>
              {/* YouTube */}
              <View style={nm.fieldWrap}>
                <Text style={nm.fieldLabel}>{t('banda.idYoutubeOpcional')}</Text>
                <TextInput style={nm.fieldInput} placeholder={t('banda.coleLinkYoutube')} placeholderTextColor={C.textDim} value={form.youtube_id} onChangeText={set('youtube_id')} autoCorrect={false} autoCapitalize="none" keyboardType="url" />
              </View>
              {/* Spotify */}
              <View style={nm.fieldWrap}>
                <Text style={nm.fieldLabel}>{t('banda.linkSpotifyOpcional')}</Text>
                <TextInput style={nm.fieldInput} placeholder={t('banda.coleLinkSpotify')} placeholderTextColor={C.textDim} value={form.spotify_id} onChangeText={set('spotify_id')} autoCorrect={false} autoCapitalize="none" keyboardType="url" />
              </View>

              {/* Prévia do que cada botão vai abrir */}
              {previewRows.length > 0 && (
                <View style={nm.previewBox}>
                  <Text style={nm.previewTitle}>{t('banda.oQueOsBotoesAbrem')}</Text>
                  {previewRows.map(r => (
                    <View key={r.label} style={nm.previewRow}>
                      <Text style={nm.previewLink}>{r.label}</Text>
                      <View style={[nm.previewTag, r.target.direct && nm.previewTagOk]}>
                        <Text style={[nm.previewTagText, r.target.direct && nm.previewTagTextOk]}>
                          {r.target.direct ? t('banda.linkSalvo') : t('banda.viaBusca')}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* No repertório? */}
              <TouchableOpacity style={nm.toggleRow} onPress={() => setInRepertoire(v => !v)} activeOpacity={0.7}>
                <Ionicons name={inRepertoire ? 'checkbox' : 'square-outline'} size={20} color={inRepertoire ? C.primary : C.textDim} />
                <Text style={nm.toggleText}>{t('banda.manterNoRepertorio')}</Text>
              </TouchableOpacity>
            </ScrollView>
            <TouchableOpacity style={[nm.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
              {saving ? <ActivityIndicator color="#fff" /> : <><Ionicons name={isEdit ? 'checkmark-outline' : 'musical-note-outline'} size={18} color="#fff" /><Text style={nm.saveBtnText}>{isEdit ? t('banda.salvarAlteracoes') : t('banda.adicionarMusica')}</Text></>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
const nm = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.75)' },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, maxHeight: '90%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 18, fontWeight: '800', color: C.text },
  fieldWrap: { marginBottom: 14 },
  fieldLabel: { fontSize: 11, color: C.textMuted, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 },
  fieldInput: { backgroundColor: C.surfaceHigh, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, height: 46, fontSize: 15, color: C.text },
  fieldInputError: { borderColor: C.danger },
  fieldError: { fontSize: 11, color: C.danger, marginTop: 3 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.primary, borderRadius: 12, paddingVertical: 14, marginTop: 8 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  previewBox: { backgroundColor: C.surfaceHigh, borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: C.border },
  previewTitle: { fontSize: 11, color: C.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  previewLink: { fontSize: 12, color: C.textMuted, fontWeight: '600' },
  previewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  previewTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  previewTagOk: { backgroundColor: C.primaryDim, borderColor: C.primary },
  previewTagText: { fontSize: 10, fontWeight: '700', color: C.textDim, textTransform: 'uppercase', letterSpacing: 0.4 },
  previewTagTextOk: { color: '#fff' },
  groupLabel: { fontSize: 12, color: C.text, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 8, marginBottom: 4 },
  groupHint: { fontSize: 11, color: C.textDim, lineHeight: 15, marginBottom: 12 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, marginBottom: 4 },
  toggleText: { fontSize: 14, color: C.text },
});

// ─── Novo Culto Modal ─────────────────────────────────────────────────────────
function NovoCultoModal({ visible, onClose, onSaved, songs }: {
  visible: boolean; onClose: () => void; onSaved: () => void; songs: Song[];
}) {
  const { t, i18n } = useTranslation();
  const [date, setDate] = useState('');
  const [entries, setEntries] = useState<CultoSongEntry[]>([]);
  const [dateError, setDateError] = useState('');
  const [saving, setSaving] = useState(false);

  const isSongSelected = (id: string) => entries.some(e => e.song_id === id);
  const toggleSong = (song: Song) => {
    if (isSongSelected(song.id)) {
      setEntries(prev => prev.filter(e => e.song_id !== song.id));
    } else {
      setEntries(prev => [...prev, { song_id: song.id, song_key: song.song_key, bpm: String(song.bpm), order_index: prev.length }]);
    }
  };
  const updateEntry = (songId: string, field: 'song_key' | 'bpm', value: string) => {
    setEntries(prev => prev.map(e => e.song_id === songId ? { ...e, [field]: field === 'song_key' ? value.toUpperCase() : value } : e));
  };
  const formatDateInput = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 8);
    let f = digits;
    if (digits.length > 2) f = digits.slice(0, 2) + '/' + digits.slice(2);
    if (digits.length > 4) f = digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4);
    setDate(f); setDateError('');
  };

  const handleSave = async () => {
    const parts = date.split('/');
    if (parts.length !== 3 || parts[0].length !== 2 || parts[1].length !== 2 || parts[2].length !== 4) {
      setDateError(t('banda.usarFormatoData')); return;
    }
    if (entries.length === 0) { Alert.alert(t('common.atencao'), t('banda.selecioneUmaMusica')); return; }
    const [d, m, y] = parts;
    const iso = `${y}-${m}-${d}`;
    const label = formatDateLabel(iso, i18n.language);
    setSaving(true);

    // 1. Cria o culto
    const { data: cultoData, error: cultoError } = await supabase
      .from('cultos').insert({ label, date: iso }).select().single();
    if (cultoError || !cultoData) { Alert.alert(t('common.erro'), cultoError?.message); setSaving(false); return; }

    // 2. Insere as músicas do culto
    const cultoSongs = entries.map(e => ({
      culto_id: cultoData.id, song_id: e.song_id,
      song_key: e.song_key, bpm: Number(e.bpm), order_index: e.order_index,
    }));
    const { error: songsError } = await supabase.from('culto_songs').insert(cultoSongs);
    setSaving(false);
    if (songsError) { Alert.alert(t('banda.erroSalvarMusicas'), songsError.message); return; }

    setDate(''); setEntries([]); setDateError('');
    onSaved(); onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={md.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%' }}>
          <View style={md.sheet}>
            <View style={md.header}>
              <Text style={md.title}>{t('banda.novoCulto')}</Text>
              <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={C.textMuted} /></TouchableOpacity>
            </View>
            <Text style={md.label}>{t('banda.dataDoCulto')}</Text>
            <TextInput style={[md.input, !!dateError && md.inputError]} placeholder="DD/MM/AAAA" placeholderTextColor={C.textDim} value={date} onChangeText={formatDateInput} keyboardType="numeric" maxLength={10} />
            {!!dateError && <Text style={md.errorText}>{dateError}</Text>}
            <Text style={[md.label, { marginTop: 16 }]}>{t('banda.musicasSelecionadas', { n: entries.length })}</Text>
            <ScrollView style={md.songList} showsVerticalScrollIndicator={false}>
              {songs.map(song => {
                const selected = isSongSelected(song.id);
                const entry = entries.find(e => e.song_id === song.id);
                return (
                  <View key={song.id}>
                    <TouchableOpacity style={[md.songRow, selected && md.songRowSelected]} onPress={() => toggleSong(song)} activeOpacity={0.7}>
                      <View style={[md.keyPill, { backgroundColor: selected ? C.primaryDim : C.surfaceHigh }]}>
                        <Text style={[md.keyPillText, { color: selected ? C.primary : C.textMuted }]}>{song.song_key}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[md.songTitle, selected && { color: C.text }]}>{song.title}</Text>
                        <Text style={md.songArtist}>{song.artist} · {song.bpm} BPM</Text>
                      </View>
                      <View style={[md.checkbox, selected && md.checkboxSelected]}>
                        {selected && <Ionicons name="checkmark" size={14} color="#fff" />}
                      </View>
                    </TouchableOpacity>
                    {selected && entry && (
                      <View style={md.overrideRow}>
                        <View style={md.overrideField}>
                          <Text style={md.overrideLabel}>{t('banda.tomLabel')}</Text>
                          <TextInput style={md.overrideInput} value={entry.song_key} onChangeText={v => updateEntry(song.id, 'song_key', v)} autoCapitalize="characters" maxLength={3} placeholderTextColor={C.textDim} />
                        </View>
                        <View style={md.overrideField}>
                          <Text style={md.overrideLabel}>{t('banda.bpm')}</Text>
                          <TextInput style={md.overrideInput} value={entry.bpm} onChangeText={v => updateEntry(song.id, 'bpm', v)} keyboardType="numeric" maxLength={3} placeholderTextColor={C.textDim} />
                        </View>
                        <Text style={md.overrideHint}>{t('banda.ajusteParaEsteCulto')}</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={[md.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
              {saving ? <ActivityIndicator color="#fff" /> : <><Ionicons name="save-outline" size={18} color="#fff" /><Text style={md.saveBtnText}>{t('banda.salvarCulto')}</Text></>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
const md = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, maxHeight: '92%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 18, fontWeight: '800', color: C.text },
  label: { fontSize: 11, color: C.textMuted, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 },
  input: { backgroundColor: C.surfaceHigh, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, height: 46, fontSize: 16, color: C.text },
  inputError: { borderColor: C.danger },
  errorText: { fontSize: 12, color: C.danger, marginTop: 4 },
  songList: { maxHeight: 320, marginBottom: 16 },
  songRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 10, marginBottom: 4, backgroundColor: C.surfaceHigh, borderWidth: 1, borderColor: 'transparent' },
  songRowSelected: { borderColor: C.primary, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, marginBottom: 0 },
  keyPill: { width: 32, height: 32, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  keyPillText: { fontSize: 12, fontWeight: '800' },
  songTitle: { fontSize: 14, fontWeight: '600', color: C.textMuted },
  songArtist: { fontSize: 11, color: C.textDim, marginTop: 1 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  checkboxSelected: { backgroundColor: C.primary, borderColor: C.primary },
  overrideRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.primaryDim, borderWidth: 1, borderTopWidth: 0, borderColor: C.primary, borderBottomLeftRadius: 10, borderBottomRightRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 4 },
  overrideField: { alignItems: 'center', gap: 3 },
  overrideLabel: { fontSize: 9, color: C.primary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  overrideInput: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.primary, borderRadius: 6, width: 52, height: 32, textAlign: 'center', fontSize: 14, fontWeight: '700', color: C.text },
  overrideHint: { flex: 1, fontSize: 11, color: C.primary, opacity: 0.7, textAlign: 'right' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.primary, borderRadius: 12, paddingVertical: 14 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});

// ─── Botões de link (cifra, letra, YouTube, Spotify) ────────────────────────
// Quatro botões em toda música, em qualquer lista. Aceso = a banda salvou o
// link direto daquela música. Apagado = ainda não tem link salvo, e o botão
// abre a BUSCA do site já preenchida com título + artista — nunca um 404.
function LinkMiniButtons({ song, openLink }: { song: Song; openLink: (target: LinkTarget, label: string) => void }) {
  const cifra = cifraTarget(song);
  const letra = letraTarget(song);
  const yt = youtubeTarget(song);
  const sp = spotifyTarget(song);
  return (
    <View style={{ flexDirection: 'row', gap: 5 }}>
      <TouchableOpacity style={[s.linkBtn, s.linkBtnMini, !cifra.direct && s.linkBtnDisabled]} onPress={() => openLink(cifra, 'Cifra Club')}>
        <Text style={s.linkBtnLabel}>CI</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[s.linkBtn, s.linkBtnMini, !letra.direct && s.linkBtnDisabled]} onPress={() => openLink(letra, 'Letras')}>
        <Ionicons name="document-text-outline" size={14} color={C.textMuted} />
      </TouchableOpacity>
      <TouchableOpacity style={[s.linkBtn, s.linkBtnMini, yt.direct ? s.linkBtnYt : s.linkBtnDisabled]} onPress={() => openLink(yt, 'YouTube')}>
        <Ionicons name="logo-youtube" size={14} color={yt.direct ? '#FF0000' : C.textDim} />
      </TouchableOpacity>
      <TouchableOpacity style={[s.linkBtn, s.linkBtnMini, sp.direct ? s.spotifyBtn : s.spotifyBtnDisabled]} onPress={() => openLink(sp, 'Spotify')}>
        <Ionicons name="musical-note" size={14} color={sp.direct ? C.accent : C.textDim} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Novo Ensaio Modal ────────────────────────────────────────────────────────
// Igual ao NovoCultoModal (data + músicas do repertório com tom/BPM
// ajustáveis), só que também pede horário, local e uma observação opcional —
// os mesmos dados que a aba Ensaios sempre mostrou, agora vindos do banco.
function NovoEnsaioModal({ visible, onClose, onSaved, songs }: {
  visible: boolean; onClose: () => void; onSaved: () => void; songs: Song[];
}) {
  const { t, i18n } = useTranslation();
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [local, setLocal] = useState('');
  const [observacao, setObservacao] = useState('');
  const [entries, setEntries] = useState<CultoSongEntry[]>([]);
  const [dateError, setDateError] = useState('');
  const [saving, setSaving] = useState(false);

  const isSongSelected = (id: string) => entries.some(e => e.song_id === id);
  const toggleSong = (song: Song) => {
    if (isSongSelected(song.id)) {
      setEntries(prev => prev.filter(e => e.song_id !== song.id));
    } else {
      setEntries(prev => [...prev, { song_id: song.id, song_key: song.song_key, bpm: String(song.bpm), order_index: prev.length }]);
    }
  };
  const updateEntry = (songId: string, field: 'song_key' | 'bpm', value: string) => {
    setEntries(prev => prev.map(e => e.song_id === songId ? { ...e, [field]: field === 'song_key' ? value.toUpperCase() : value } : e));
  };
  const formatDateInput = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 8);
    let f = digits;
    if (digits.length > 2) f = digits.slice(0, 2) + '/' + digits.slice(2);
    if (digits.length > 4) f = digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4);
    setDate(f); setDateError('');
  };

  const handleSave = async () => {
    const parts = date.split('/');
    if (parts.length !== 3 || parts[0].length !== 2 || parts[1].length !== 2 || parts[2].length !== 4) {
      setDateError(t('banda.usarFormatoData')); return;
    }
    if (!time.trim() || !local.trim()) { Alert.alert(t('common.atencao'), t('banda.preencherHorarioLocal')); return; }
    if (entries.length === 0) { Alert.alert(t('common.atencao'), t('banda.selecioneUmaMusica')); return; }
    const [d, m, y] = parts;
    const iso = `${y}-${m}-${d}`;
    const label = formatDateLabel(iso, i18n.language);
    setSaving(true);

    const { data: ensaioData, error: ensaioError } = await supabase
      .from('ensaios').insert({ label, date: iso, time: time.trim(), local: local.trim(), observacao: observacao.trim() }).select().single();
    if (ensaioError || !ensaioData) { Alert.alert(t('common.erro'), ensaioError?.message ?? t('banda.erroSalvarEnsaio')); setSaving(false); return; }

    const ensaioSongs = entries.map(e => ({
      ensaio_id: ensaioData.id, song_id: e.song_id,
      song_key: e.song_key, bpm: Number(e.bpm), order_index: e.order_index,
    }));
    const { error: songsError } = await supabase.from('ensaio_songs').insert(ensaioSongs);
    setSaving(false);
    if (songsError) { Alert.alert(t('banda.erroSalvarMusicas'), songsError.message); return; }

    setDate(''); setTime(''); setLocal(''); setObservacao(''); setEntries([]); setDateError('');
    onSaved(); onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={md.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%' }}>
          <View style={md.sheet}>
            <View style={md.header}>
              <Text style={md.title}>{t('banda.novoEnsaio')}</Text>
              <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={C.textMuted} /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={md.label}>{t('banda.dataDoEnsaio')}</Text>
              <TextInput style={[md.input, !!dateError && md.inputError]} placeholder="DD/MM/AAAA" placeholderTextColor={C.textDim} value={date} onChangeText={formatDateInput} keyboardType="numeric" maxLength={10} />
              {!!dateError && <Text style={md.errorText}>{dateError}</Text>}

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
                <View style={{ flex: 1 }}>
                  <Text style={md.label}>{t('banda.horarioDoEnsaio')}</Text>
                  <TextInput style={md.input} placeholder="Ex: 19:00" placeholderTextColor={C.textDim} value={time} onChangeText={setTime} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={md.label}>{t('banda.localDoEnsaio')}</Text>
                  <TextInput style={md.input} placeholder={t('banda.localPlaceholder')} placeholderTextColor={C.textDim} value={local} onChangeText={setLocal} />
                </View>
              </View>

              <Text style={[md.label, { marginTop: 14 }]}>{t('banda.observacaoOpcional')}</Text>
              <TextInput style={md.input} placeholder={t('banda.observacaoPlaceholder')} placeholderTextColor={C.textDim} value={observacao} onChangeText={setObservacao} />

              <Text style={[md.label, { marginTop: 16 }]}>{t('banda.musicasSelecionadas', { n: entries.length })}</Text>
              <View style={md.songList}>
                {songs.map(song => {
                  const selected = isSongSelected(song.id);
                  const entry = entries.find(e => e.song_id === song.id);
                  return (
                    <View key={song.id}>
                      <TouchableOpacity style={[md.songRow, selected && md.songRowSelected]} onPress={() => toggleSong(song)} activeOpacity={0.7}>
                        <View style={[md.keyPill, { backgroundColor: selected ? C.primaryDim : C.surfaceHigh }]}>
                          <Text style={[md.keyPillText, { color: selected ? C.primary : C.textMuted }]}>{song.song_key}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[md.songTitle, selected && { color: C.text }]}>{song.title}</Text>
                          <Text style={md.songArtist}>{song.artist} · {song.bpm} BPM</Text>
                        </View>
                        <View style={[md.checkbox, selected && md.checkboxSelected]}>
                          {selected && <Ionicons name="checkmark" size={14} color="#fff" />}
                        </View>
                      </TouchableOpacity>
                      {selected && entry && (
                        <View style={md.overrideRow}>
                          <View style={md.overrideField}>
                            <Text style={md.overrideLabel}>{t('banda.tomLabel')}</Text>
                            <TextInput style={md.overrideInput} value={entry.song_key} onChangeText={v => updateEntry(song.id, 'song_key', v)} autoCapitalize="characters" maxLength={3} placeholderTextColor={C.textDim} />
                          </View>
                          <View style={md.overrideField}>
                            <Text style={md.overrideLabel}>{t('banda.bpm')}</Text>
                            <TextInput style={md.overrideInput} value={entry.bpm} onChangeText={v => updateEntry(song.id, 'bpm', v)} keyboardType="numeric" maxLength={3} placeholderTextColor={C.textDim} />
                          </View>
                          <Text style={md.overrideHint}>{t('banda.ajusteParaEsteCulto')}</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </ScrollView>
            <TouchableOpacity style={[md.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
              {saving ? <ActivityIndicator color="#fff" /> : <><Ionicons name="save-outline" size={18} color="#fff" /><Text style={md.saveBtnText}>{t('banda.salvarEnsaio')}</Text></>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─── Adicionar à Escala Modal ─────────────────────────────────────────────────
// Usado tanto em Cultos quanto em Ensaios (props `tipo`/`eventoId` decidem a
// tabela certa) — escolhe uma pessoa do diretório da banda e o instrumento
// que ela vai tocar naquele culto/ensaio específico.
const INSTRUMENTOS = ['vocal', 'violao', 'guitarra', 'baixo', 'bateria', 'teclado', 'ministro', 'outro'] as const;

function EscalaModal({ visible, onClose, onSaved, membros, tipo, eventoId }: {
  visible: boolean; onClose: () => void; onSaved: () => void;
  membros: BandaMembro[]; tipo: 'culto' | 'ensaio'; eventoId: string;
}) {
  const { t } = useTranslation();
  const [membroId, setMembroId] = useState('');
  const [instrumento, setInstrumento] = useState<typeof INSTRUMENTOS[number] | ''>('');
  const [outroTexto, setOutroTexto] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) { setMembroId(''); setInstrumento(''); setOutroTexto(''); }
  }, [visible]);

  const labelDoInstrumento: Record<typeof INSTRUMENTOS[number], string> = {
    vocal: t('banda.instVocal'), violao: t('banda.instViolao'), guitarra: t('banda.instGuitarra'),
    baixo: t('banda.instBaixo'), bateria: t('banda.instBateria'), teclado: t('banda.instTeclado'),
    ministro: t('banda.instMinistro'), outro: t('banda.instOutro'),
  };

  const handleSave = async () => {
    const instrumentoFinal = instrumento === 'outro' ? outroTexto.trim() : (instrumento ? labelDoInstrumento[instrumento] : '');
    if (!membroId || !instrumentoFinal) { Alert.alert(t('common.atencao'), t('banda.selecioneMembro')); return; }
    setSaving(true);
    const table = tipo === 'culto' ? 'culto_escala' : 'ensaio_escala';
    const idField = tipo === 'culto' ? 'culto_id' : 'ensaio_id';
    const { error } = await supabase.from(table).insert({ [idField]: eventoId, membro_id: membroId, instrumento: instrumentoFinal });
    setSaving(false);
    if (error) { Alert.alert(t('common.erro'), error.message); return; }
    onSaved(); onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={md.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%' }}>
          <View style={md.sheet}>
            <View style={md.header}>
              <Text style={md.title}>{t('banda.adicionarNaEscala')}</Text>
              <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={C.textMuted} /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={md.label}>{t('banda.pessoa')}</Text>
              {membros.length === 0 ? (
                <Text style={[s.emptyDesc, { textAlign: 'left', paddingTop: 0, marginBottom: 14 }]}>{t('banda.semMembrosNaBanda')}</Text>
              ) : (
                <View style={{ gap: 6, marginBottom: 16 }}>
                  {membros.map(m => {
                    const selected = membroId === m.id;
                    return (
                      <TouchableOpacity key={m.id} style={[md.songRow, selected && md.songRowSelected]} onPress={() => setMembroId(m.id)} activeOpacity={0.7}>
                        <View style={[md.keyPill, { backgroundColor: selected ? C.primaryDim : C.surfaceHigh }]}>
                          <Ionicons name="person" size={14} color={selected ? C.primary : C.textMuted} />
                        </View>
                        <Text style={[md.songTitle, selected && { color: C.text }]}>{m.nome}</Text>
                        <View style={[md.checkbox, selected && md.checkboxSelected]}>
                          {selected && <Ionicons name="checkmark" size={14} color="#fff" />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              <Text style={md.label}>{t('banda.escolherInstrumento')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                {INSTRUMENTOS.map(inst => (
                  <TouchableOpacity key={inst} style={[s.pill, instrumento === inst && s.pillActive]} onPress={() => setInstrumento(inst)}>
                    <Text style={[s.pillText, instrumento === inst && s.pillTextActive]}>{labelDoInstrumento[inst]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {instrumento === 'outro' && (
                <TextInput style={md.input} placeholder={t('banda.instrumentoPlaceholder')} placeholderTextColor={C.textDim} value={outroTexto} onChangeText={setOutroTexto} />
              )}
              <View style={{ height: 8 }} />
            </ScrollView>
            <TouchableOpacity style={[md.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
              {saving ? <ActivityIndicator color="#fff" /> : <><Ionicons name="person-add-outline" size={18} color="#fff" /><Text style={md.saveBtnText}>{t('banda.salvarEscala')}</Text></>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─── Escala (lista de pessoas + instrumento) ─────────────────────────────────
// Reaproveitado em Hoje (só leitura), Cultos e Ensaios (com botão de remover).
function EscalaLista({ escala, membros, onRemover }: {
  escala: EscalaEntry[]; membros: BandaMembro[]; onRemover?: (id: string) => void;
}) {
  const { t } = useTranslation();
  if (escala.length === 0) {
    return <Text style={s.escalaVazia}>{t('banda.escalaVazia')}</Text>;
  }
  return (
    <>
      {escala.map(e => {
        const membro = membros.find(m => m.id === e.membro_id);
        return (
          <View key={e.id} style={s.escalaRow}>
            <Ionicons name="person-circle-outline" size={18} color={C.textMuted} />
            <Text style={s.escalaNome} numberOfLines={1}>{membro?.nome ?? '—'}</Text>
            <View style={s.escalaInstChip}><Text style={s.escalaInstText}>{e.instrumento}</Text></View>
            {!!onRemover && (
              <TouchableOpacity onPress={() => onRemover(e.id)} hitSlop={6}>
                <Ionicons name="close-circle-outline" size={17} color={C.danger} />
              </TouchableOpacity>
            )}
          </View>
        );
      })}
    </>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
function BandaMain() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('hoje');
  const [songs, setSongs] = useState<Song[]>([]);
  const [cultos, setCultos] = useState<Culto[]>([]);
  const [ensaios, setEnsaios] = useState<Ensaio[]>([]);
  const [membros, setMembros] = useState<BandaMembro[]>([]);
  const [loadingSongs, setLoadingSongs] = useState(true);
  const [loadingCultos, setLoadingCultos] = useState(true);
  const [loadingEnsaios, setLoadingEnsaios] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedCulto, setExpandedCulto] = useState<string | null>(null);
  const [expandedEnsaio, setExpandedEnsaio] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'repertoire'>('all');
  const [chatMsg, setChatMsg] = useState('');
  const [messages, setMessages] = useState<ChatMsg[]>(CHAT_INIT);
  const [cultosModal, setCultosModal] = useState(false);
  const [ensaioModal, setEnsaioModal] = useState(false);
  const [musicaModal, setMusicaModal] = useState(false);
  // Música sendo editada no modal — null significa "cadastrando uma nova".
  const [editSong, setEditSong] = useState<Song | null>(null);
  const [escalaModal, setEscalaModal] = useState<{ tipo: 'culto' | 'ensaio'; eventoId: string } | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const today = todayISO();

  // ── Fetch songs ──────────────────────────────────────────────────────────────
  const fetchSongs = useCallback(async () => {
    const { data } = await supabase.from('songs').select('*').order('title');
    // Sanitiza o que já está no banco antes de usar: músicas cadastradas antes
    // desta correção podem ter a URL inteira salva no campo de ID (o extractor
    // antigo aceitava qualquer texto), o que montava um link quebrado. Se o
    // valor guardado não for um ID válido, ele vira '' e o botão passa a abrir
    // a busca — que sempre funciona.
    if (data) setSongs((data as Song[]).map(sg => ({
      ...sg,
      youtube_id: extractYoutubeId(sg.youtube_id ?? ''),
      spotify_id: extractSpotifyId(sg.spotify_id ?? ''),
    })));
    setLoadingSongs(false);
  }, []);

  // ── Fetch diretório da banda (pra montar a escala) ───────────────────────────
  const fetchMembros = useCallback(async () => {
    const { data } = await supabase.from('banda_membros').select('*').order('nome');
    if (data) setMembros(data as BandaMembro[]);
  }, []);

  // ── Fetch cultos com músicas e escala ────────────────────────────────────────
  const fetchCultos = useCallback(async () => {
    const { data: cultosData } = await supabase
      .from('cultos').select('*').order('date', { ascending: false });
    if (!cultosData) { setLoadingCultos(false); setRefreshing(false); return; }

    const cultosWithEntries: Culto[] = await Promise.all(
      cultosData.map(async (culto: any) => {
        const [{ data: entriesData }, { data: escalaData }] = await Promise.all([
          supabase.from('culto_songs').select('*').eq('culto_id', culto.id).order('order_index'),
          supabase.from('culto_escala').select('*').eq('culto_id', culto.id),
        ]);
        return {
          id: culto.id, label: culto.label, date: culto.date,
          entries: (entriesData ?? []).map((e: any) => ({
            song_id: e.song_id, song_key: e.song_key,
            bpm: String(e.bpm), order_index: e.order_index,
          })),
          escala: (escalaData ?? []).map((e: any) => ({
            id: e.id, membro_id: e.membro_id, instrumento: e.instrumento,
          })),
        };
      })
    );
    setCultos(cultosWithEntries);
    if (cultosWithEntries.length > 0) setExpandedCulto(cultosWithEntries[0].id);
    setLoadingCultos(false);
    setRefreshing(false);
  }, []);

  // ── Fetch ensaios com músicas e escala ───────────────────────────────────────
  const fetchEnsaios = useCallback(async () => {
    const { data: ensaiosData } = await supabase
      .from('ensaios').select('*').order('date', { ascending: true });
    if (!ensaiosData) { setLoadingEnsaios(false); return; }

    const ensaiosWithEntries: Ensaio[] = await Promise.all(
      ensaiosData.map(async (ensaio: any) => {
        const [{ data: entriesData }, { data: escalaData }] = await Promise.all([
          supabase.from('ensaio_songs').select('*').eq('ensaio_id', ensaio.id).order('order_index'),
          supabase.from('ensaio_escala').select('*').eq('ensaio_id', ensaio.id),
        ]);
        return {
          id: ensaio.id, label: ensaio.label, date: ensaio.date,
          time: ensaio.time ?? '', local: ensaio.local ?? '', observacao: ensaio.observacao ?? '',
          entries: (entriesData ?? []).map((e: any) => ({
            song_id: e.song_id, song_key: e.song_key,
            bpm: String(e.bpm), order_index: e.order_index,
          })),
          escala: (escalaData ?? []).map((e: any) => ({
            id: e.id, membro_id: e.membro_id, instrumento: e.instrumento,
          })),
        };
      })
    );
    setEnsaios(ensaiosWithEntries);
    if (ensaiosWithEntries.length > 0) setExpandedEnsaio(ensaiosWithEntries[0].id);
    setLoadingEnsaios(false);
  }, []);

  useEffect(() => { fetchSongs(); fetchCultos(); fetchEnsaios(); fetchMembros(); }, [fetchSongs, fetchCultos, fetchEnsaios, fetchMembros]);

  const handleRefresh = () => { setRefreshing(true); fetchSongs(); fetchCultos(); fetchEnsaios(); fetchMembros(); };

  const removerDaEscala = (tipo: 'culto' | 'ensaio', id: string) => {
    Alert.alert(t('banda.removerDaEscala'), t('banda.desejaRemoverDaEscala'), [
      { text: t('common.cancelar'), style: 'cancel' },
      { text: t('common.remover'), style: 'destructive', onPress: async () => {
        await supabase.from(tipo === 'culto' ? 'culto_escala' : 'ensaio_escala').delete().eq('id', id);
        tipo === 'culto' ? fetchCultos() : fetchEnsaios();
      }},
    ]);
  };

  const deleteCulto = (id: string) => {
    Alert.alert(t('banda.removerCulto'), t('banda.desejaRemoverCulto'), [
      { text: t('common.cancelar'), style: 'cancel' },
      { text: t('common.remover'), style: 'destructive', onPress: async () => {
        await supabase.from('cultos').delete().eq('id', id);
        fetchCultos();
      }},
    ]);
  };

  const deleteEnsaio = (id: string) => {
    Alert.alert(t('banda.removerEnsaio'), t('banda.desejaRemoverEnsaio'), [
      { text: t('common.cancelar'), style: 'cancel' },
      { text: t('common.remover'), style: 'destructive', onPress: async () => {
        await supabase.from('ensaios').delete().eq('id', id);
        fetchEnsaios();
      }},
    ]);
  };

  // Abre o destino já resolvido (link salvo ou busca do site). O guard de URL
  // vazia fica como rede de segurança: antes ele nunca disparava, porque
  // spotifyUrl('') devolvia "https://open.spotify.com/track/" — não vazio — e o
  // app abria uma página quebrada em vez de avisar que faltava o link.
  const openLink = (target: LinkTarget, label: string) => {
    if (!target?.url) { Alert.alert(t('banda.semLink'), t('banda.semLinkMsg', { label })); return; }
    Linking.openURL(target.url).catch(() => Alert.alert(t('common.erro'), t('banda.erroAbrirLink')));
  };

  const abrirNovaMusica = () => { setEditSong(null); setMusicaModal(true); };
  const abrirEditarMusica = (song: Song) => { setEditSong(song); setMusicaModal(true); };
  const fecharMusicaModal = () => { setMusicaModal(false); setEditSong(null); };

  const sendMessage = () => {
    if (!chatMsg.trim()) return;
    const now = new Date();
    const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2,'0')}`;
    setMessages(prev => [...prev, { id: String(Date.now()), author: 'Você', text: chatMsg.trim(), time, mine: true }]);
    setChatMsg('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const cultoDoDia = cultos.find(c => c.date === today) ?? cultos[0] ?? null;
  const filteredSongs = filter === 'repertoire' ? songs.filter(sg => sg.in_repertoire) : songs;

  const TABS: { id: Tab; icon: string; label: string }[] = [
    { id: 'hoje', icon: 'sunny-outline', label: t('banda.tabHoje') },
    { id: 'repertorio', icon: 'musical-notes-outline', label: t('banda.tabRepertorio') },
    { id: 'cultos', icon: 'mic-outline', label: t('banda.tabCultos') },
    { id: 'ensaios', icon: 'calendar-outline', label: t('banda.tabEnsaios') },
    { id: 'chat', icon: 'chatbubbles-outline', label: t('banda.tabChat') },
  ];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>{t('banda.titulo')}</Text>
          <Text style={s.headerSub}>{t('banda.subtitulo')}</Text>
        </View>
        <View style={s.headerRight}>
          <View style={s.onlineDot} />
          <Text style={s.onlineText}>{songs.length} {t('banda.musicas')}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={s.tabBar}>
        {TABS.map(tab => (
          <TouchableOpacity key={tab.id} style={[s.tabItem, activeTab === tab.id && s.tabItemActive]} onPress={() => setActiveTab(tab.id)}>
            <Ionicons name={tab.icon as any} size={17} color={activeTab === tab.id ? C.primary : C.textMuted} />
            <Text style={[s.tabLabel, activeTab === tab.id && s.tabLabelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ══ HOJE ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'hoje' && (
        <ScrollView contentContainerStyle={s.tabContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.primary} />}>
          {loadingCultos ? (
            <View style={s.loadingWrap}><ActivityIndicator color={C.primary} /><Text style={s.loadingText}>{t('banda.carregando')}</Text></View>
          ) : cultoDoDia ? (
            <>
              <View style={s.hojeBanner}>
                <View style={s.hojeBannerLeft}>
                  <Ionicons name="sunny" size={20} color={C.gold} />
                  <View>
                    <Text style={s.hojeBannerLabel}>{cultoDoDia.date === today ? t('banda.cultoDeHoje') : t('banda.proximoCulto')}</Text>
                    <Text style={s.hojeBannerDate}>{cultoDoDia.label}</Text>
                  </View>
                </View>
                <View style={s.hojeSongCount}>
                  <Text style={s.hojeSongCountNum}>{cultoDoDia.entries.length}</Text>
                  <Text style={s.hojeSongCountLabel}>{t('banda.musicas')}</Text>
                </View>
              </View>
              <Text style={s.sectionLabel}>{t('banda.setlist')}</Text>
              {cultoDoDia.entries.map((entry, idx) => {
                const song = songs.find(sg => sg.id === entry.song_id);
                if (!song) return null;
                return (
                  <View key={entry.song_id} style={s.hojeCard}>
                    <View style={s.hojeOrder}><Text style={s.hojeOrderNum}>{idx + 1}</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.hojeSongTitle}>{song.title}</Text>
                      <Text style={s.hojeSongArtist}>{song.artist}</Text>
                    </View>
                    <View style={s.hojeTomBadge}>
                      <Text style={s.hojeTomLabel}>{t('banda.tom')}</Text>
                      <Text style={s.hojeTomValue}>{entry.song_key}</Text>
                    </View>
                    <View style={s.hojeBpmBadge}>
                      <Text style={s.hojeBpmLabel}>{t('banda.bpm')}</Text>
                      <Text style={s.hojeBpmValue}>{entry.bpm}</Text>
                    </View>
                    <LinkMiniButtons song={song} openLink={openLink} />
                  </View>
                );
              })}
              <View style={s.hojeTip}>
                <Ionicons name="information-circle-outline" size={14} color={C.textDim} />
                <Text style={s.hojeTipText}>{t('banda.dicaTomBpm')}</Text>
              </View>
              <Text style={[s.sectionLabel, { marginTop: 20 }]}>{t('banda.escalaDeHoje')}</Text>
              <View style={s.escalaCard}>
                <EscalaLista escala={cultoDoDia.escala} membros={membros} />
              </View>
            </>
          ) : (
            <View style={s.emptyState}>
              <Ionicons name="sunny-outline" size={48} color={C.textDim} />
              <Text style={s.emptyTitle}>{t('banda.nenhumCultoAgendado')}</Text>
              <Text style={s.emptyDesc}>{t('banda.crieUmCulto')}</Text>
              <TouchableOpacity style={s.emptyBtn} onPress={() => setActiveTab('cultos')}>
                <Text style={s.emptyBtnText}>{t('banda.irParaCultos')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {/* ══ REPERTÓRIO ════════════════════════════════════════════════════════ */}
      {activeTab === 'repertorio' && (
        <View style={{ flex: 1 }}>
          <View style={s.reperToolbar}>
            <View style={s.filterRow}>
              {(['all', 'repertoire'] as const).map(f => (
                <TouchableOpacity key={f} style={[s.pill, filter === f && s.pillActive]} onPress={() => setFilter(f)}>
                  <Text style={[s.pillText, filter === f && s.pillTextActive]}>{f === 'all' ? t('banda.todas') : t('banda.noRepertorio')}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={s.addSongBtn} onPress={abrirNovaMusica}>
              <Ionicons name="add" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
          {loadingSongs ? (
            <View style={s.loadingWrap}><ActivityIndicator color={C.primary} /></View>
          ) : (
            <FlatList
              data={filteredSongs}
              keyExtractor={i => i.id}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.primary} />}
              renderItem={({ item }) => (
                <View style={s.songCard}>
                  <View style={[s.keyBadge, { backgroundColor: item.in_repertoire ? C.primaryDim : C.surfaceHigh }]}>
                    <Text style={[s.keyText, { color: item.in_repertoire ? C.primary : C.textMuted }]}>{item.song_key}</Text>
                  </View>
                  <TouchableOpacity style={{ flex: 1, marginLeft: 10 }} onPress={() => abrirEditarMusica(item)} activeOpacity={0.7}>
                    <View style={s.songTitleRow}>
                      <Text style={[s.songTitle, { flexShrink: 1 }]} numberOfLines={1}>{item.title}</Text>
                      <Ionicons name="create-outline" size={13} color={C.textDim} />
                    </View>
                    <Text style={s.songArtist} numberOfLines={1}>{item.artist}</Text>
                    <View style={s.songMeta}>
                      <View style={s.songMetaChip}><Text style={s.songMetaText}>{t('banda.tomLabel')} {item.song_key}</Text></View>
                      <View style={s.songMetaChip}><Text style={s.songMetaText}>{item.bpm} BPM</Text></View>
                    </View>
                  </TouchableOpacity>
                  <View style={s.songLinks}>
                    <LinkMiniButtons song={item} openLink={openLink} />
                  </View>
                </View>
              )}
            />
          )}
          <MusicaModal visible={musicaModal} song={editSong} onClose={fecharMusicaModal} onSaved={fetchSongs} />
        </View>
      )}

      {/* ══ CULTOS ════════════════════════════════════════════════════════════ */}
      {activeTab === 'cultos' && (
        <View style={{ flex: 1 }}>
          <View style={s.cultosToolbar}>
            <Text style={s.cultosCount}>{cultos.length} {cultos.length !== 1 ? t('banda.tabCultos').toLowerCase() : t('banda.cultoSingular')}</Text>
            <TouchableOpacity style={s.newCultoBtn} onPress={() => setCultosModal(true)} activeOpacity={0.85}>
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={s.newCultoBtnText}>{t('banda.novoCulto')}</Text>
            </TouchableOpacity>
          </View>
          {loadingCultos ? (
            <View style={s.loadingWrap}><ActivityIndicator color={C.primary} /></View>
          ) : cultos.length === 0 ? (
            <View style={s.emptyState}>
              <Ionicons name="mic-outline" size={48} color={C.textDim} />
              <Text style={s.emptyTitle}>{t('banda.nenhumCultoAinda')}</Text>
              <Text style={s.emptyDesc}>{t('banda.toqueNovoCulto')}</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.primary} />}>
              {cultos.map(culto => {
                const isOpen = expandedCulto === culto.id;
                return (
                  <View key={culto.id} style={[s.cultoCard, isOpen && s.cultoCardOpen]}>
                    <TouchableOpacity style={s.cultoHeader} onPress={() => setExpandedCulto(isOpen ? null : culto.id)} activeOpacity={0.8}>
                      <View style={s.cultoHeaderLeft}>
                        <View style={[s.cultoDot, culto.date === today && { backgroundColor: C.gold }]} />
                        <View>
                          <Text style={s.cultoLabel}>{culto.label}</Text>
                          <Text style={s.cultoMeta}>{culto.entries.length} {culto.entries.length !== 1 ? t('banda.musicas') : t('banda.musica')}{culto.date === today ? t('banda.hojeSufixo') : ''}</Text>
                        </View>
                      </View>
                      <View style={s.cultoHeaderRight}>
                        <TouchableOpacity onPress={() => deleteCulto(culto.id)} style={s.deleteBtn}>
                          <Ionicons name="trash-outline" size={15} color={C.danger} />
                        </TouchableOpacity>
                        <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={C.textMuted} />
                      </View>
                    </TouchableOpacity>
                    {isOpen && (
                      <View style={s.cultoSongs}>
                        <View style={s.cultoColHeader}>
                          <Text style={[s.cultoColLabel, { flex: 1, marginLeft: 52 }]}>{t('banda.colunaMusica')}</Text>
                          <Text style={[s.cultoColLabel, { width: 44, textAlign: 'center' }]}>{t('banda.tomLabel')}</Text>
                          <Text style={[s.cultoColLabel, { width: 44, textAlign: 'center' }]}>{t('banda.bpm')}</Text>
                          <View style={{ width: 28 }} />
                        </View>
                        {culto.entries.map((entry, idx) => {
                          const song = songs.find(sg => sg.id === entry.song_id);
                          if (!song) return null;
                          return (
                            <View key={entry.song_id} style={[s.cultoSongRow, idx === culto.entries.length - 1 && { borderBottomWidth: 0 }]}>
                              <Text style={s.cultoSongNum}>{idx + 1}</Text>
                              <View style={s.cultoKeyBadge}><Text style={s.cultoKeyText}>{entry.song_key}</Text></View>
                              <View style={{ flex: 1 }}>
                                <Text style={s.cultoSongTitle}>{song.title}</Text>
                                <Text style={s.cultoSongArtist}>{song.artist}</Text>
                              </View>
                              <View style={s.cultoBpmChip}><Text style={s.cultoBpmText}>{entry.bpm}</Text></View>
                              <LinkMiniButtons song={song} openLink={openLink} />
                            </View>
                          );
                        })}
                        <View style={s.escalaHeader}>
                          <Text style={s.cultoColLabel}>{t('banda.escala').toUpperCase()}</Text>
                          <TouchableOpacity onPress={() => setEscalaModal({ tipo: 'culto', eventoId: culto.id })} hitSlop={6}>
                            <Ionicons name="person-add-outline" size={16} color={C.primary} />
                          </TouchableOpacity>
                        </View>
                        <EscalaLista escala={culto.escala} membros={membros} onRemover={id => removerDaEscala('culto', id)} />
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          )}
          <NovoCultoModal visible={cultosModal} onClose={() => setCultosModal(false)} onSaved={fetchCultos} songs={songs} />
        </View>
      )}

      {/* ══ ENSAIOS ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'ensaios' && (
        <View style={{ flex: 1 }}>
          <View style={s.cultosToolbar}>
            <Text style={s.cultosCount}>{ensaios.length} {ensaios.length !== 1 ? t('banda.tabEnsaios').toLowerCase() : t('banda.ensaioSingular')}</Text>
            <TouchableOpacity style={s.newCultoBtn} onPress={() => setEnsaioModal(true)} activeOpacity={0.85}>
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={s.newCultoBtnText}>{t('banda.novoEnsaio')}</Text>
            </TouchableOpacity>
          </View>
          {loadingEnsaios ? (
            <View style={s.loadingWrap}><ActivityIndicator color={C.primary} /></View>
          ) : ensaios.length === 0 ? (
            <View style={s.emptyState}>
              <Ionicons name="calendar-outline" size={48} color={C.textDim} />
              <Text style={s.emptyTitle}>{t('banda.nenhumEnsaioAinda')}</Text>
              <Text style={s.emptyDesc}>{t('banda.toqueNovoEnsaio')}</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.primary} />}>
              {ensaios.map(ensaio => {
                const isOpen = expandedEnsaio === ensaio.id;
                const { dia, mes } = diaEMes(ensaio.date);
                return (
                  <View key={ensaio.id} style={[s.cultoCard, isOpen && s.cultoCardOpen]}>
                    <TouchableOpacity style={s.cultoHeader} onPress={() => setExpandedEnsaio(isOpen ? null : ensaio.id)} activeOpacity={0.8}>
                      <View style={s.ensaioDate}>
                        <Text style={s.ensaioDay}>{dia}</Text>
                        <Text style={s.ensaioMonth}>{mes}</Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={s.cultoLabel}>{ensaio.label}{ensaio.date === today ? t('banda.hojeSufixo') : ''}</Text>
                        {!!ensaio.time && (
                          <View style={s.ensaioLocalRow}>
                            <Ionicons name="time-outline" size={13} color={C.textMuted} />
                            <Text style={s.ensaioLocal}>{ensaio.time}</Text>
                          </View>
                        )}
                        {!!ensaio.local && (
                          <View style={s.ensaioLocalRow}>
                            <Ionicons name="location-outline" size={13} color={C.textMuted} />
                            <Text style={s.ensaioLocal}>{ensaio.local}</Text>
                          </View>
                        )}
                        {!!ensaio.observacao && (
                          <View style={s.obsRow}>
                            <Ionicons name="information-circle-outline" size={13} color={C.primary} />
                            <Text style={s.obsText}>{ensaio.observacao}</Text>
                          </View>
                        )}
                      </View>
                      <View style={s.cultoHeaderRight}>
                        <TouchableOpacity onPress={() => deleteEnsaio(ensaio.id)} style={s.deleteBtn}>
                          <Ionicons name="trash-outline" size={15} color={C.danger} />
                        </TouchableOpacity>
                        <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={C.textMuted} />
                      </View>
                    </TouchableOpacity>
                    {isOpen && (
                      <View style={s.cultoSongs}>
                        <View style={s.cultoColHeader}>
                          <Text style={[s.cultoColLabel, { flex: 1, marginLeft: 52 }]}>{t('banda.colunaMusica')}</Text>
                          <Text style={[s.cultoColLabel, { width: 44, textAlign: 'center' }]}>{t('banda.tomLabel')}</Text>
                          <Text style={[s.cultoColLabel, { width: 44, textAlign: 'center' }]}>{t('banda.bpm')}</Text>
                          <View style={{ width: 28 }} />
                        </View>
                        {ensaio.entries.length === 0 ? (
                          <Text style={s.emptyDesc}>{t('banda.selecioneUmaMusica')}</Text>
                        ) : ensaio.entries.map((entry, idx) => {
                          const song = songs.find(sg => sg.id === entry.song_id);
                          if (!song) return null;
                          return (
                            <View key={entry.song_id} style={[s.cultoSongRow, idx === ensaio.entries.length - 1 && { borderBottomWidth: 0 }]}>
                              <Text style={s.cultoSongNum}>{idx + 1}</Text>
                              <View style={s.cultoKeyBadge}><Text style={s.cultoKeyText}>{entry.song_key}</Text></View>
                              <View style={{ flex: 1 }}>
                                <Text style={s.cultoSongTitle}>{song.title}</Text>
                                <Text style={s.cultoSongArtist}>{song.artist}</Text>
                              </View>
                              <View style={s.cultoBpmChip}><Text style={s.cultoBpmText}>{entry.bpm}</Text></View>
                              <LinkMiniButtons song={song} openLink={openLink} />
                            </View>
                          );
                        })}
                        <View style={s.escalaHeader}>
                          <Text style={s.cultoColLabel}>{t('banda.escala').toUpperCase()}</Text>
                          <TouchableOpacity onPress={() => setEscalaModal({ tipo: 'ensaio', eventoId: ensaio.id })} hitSlop={6}>
                            <Ionicons name="person-add-outline" size={16} color={C.primary} />
                          </TouchableOpacity>
                        </View>
                        <EscalaLista escala={ensaio.escala} membros={membros} onRemover={id => removerDaEscala('ensaio', id)} />
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          )}
          <NovoEnsaioModal visible={ensaioModal} onClose={() => setEnsaioModal(false)} onSaved={fetchEnsaios} songs={songs} />
        </View>
      )}

      {/* ══ CHAT ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'chat' && (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
          <ScrollView ref={scrollRef} contentContainerStyle={s.chatContent} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}>
            {messages.map(m => (
              <View key={m.id} style={[s.bubble, m.mine && s.bubbleMine]}>
                {!m.mine && <Text style={s.bubbleAuthor}>{m.author}</Text>}
                <Text style={[s.bubbleText, m.mine && s.bubbleTextMine]}>{m.text}</Text>
                <Text style={[s.bubbleTime, m.mine && s.bubbleTimeMine]}>{m.time}</Text>
              </View>
            ))}
          </ScrollView>
          <View style={s.chatInput}>
            <TextInput style={s.chatField} placeholder={t('banda.mensagemPlaceholder')} placeholderTextColor={C.textDim} value={chatMsg} onChangeText={setChatMsg} returnKeyType="send" onSubmitEditing={sendMessage} />
            <TouchableOpacity style={s.sendBtn} onPress={sendMessage}>
              <Ionicons name="send" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      {!!escalaModal && (
        <EscalaModal
          visible={!!escalaModal}
          onClose={() => setEscalaModal(null)}
          onSaved={() => (escalaModal.tipo === 'culto' ? fetchCultos() : fetchEnsaios())}
          membros={membros}
          tipo={escalaModal.tipo}
          eventoId={escalaModal.eventoId}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { fontSize: 20, fontWeight: '800', color: C.text, letterSpacing: 0.3 },
  headerSub: { fontSize: 11, color: C.primary, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.accent },
  onlineText: { fontSize: 12, color: C.textMuted },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.surface },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 10, gap: 3 },
  tabItemActive: { borderBottomWidth: 2, borderBottomColor: C.primary },
  tabLabel: { fontSize: 9, color: C.textMuted, fontWeight: '500' },
  tabLabelActive: { color: C.primary, fontWeight: '700' },
  tabContent: { padding: 16, paddingBottom: 32 },
  sectionLabel: { fontSize: 11, color: C.textMuted, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 60 },
  loadingText: { fontSize: 13, color: C.textMuted },
  // Hoje
  hojeBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: C.border },
  hojeBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hojeBannerLabel: { fontSize: 11, color: C.gold, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  hojeBannerDate: { fontSize: 16, fontWeight: '800', color: C.text, marginTop: 2 },
  hojeSongCount: { alignItems: 'center', backgroundColor: C.surfaceHigh, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  hojeSongCountNum: { fontSize: 22, fontWeight: '800', color: C.primary },
  hojeSongCountLabel: { fontSize: 10, color: C.textMuted },
  hojeCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surface, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: C.border },
  hojeOrder: { width: 24, height: 24, borderRadius: 12, backgroundColor: C.primaryDim, alignItems: 'center', justifyContent: 'center' },
  hojeOrderNum: { fontSize: 12, fontWeight: '800', color: C.primary },
  hojeSongTitle: { fontSize: 14, fontWeight: '700', color: C.text },
  hojeSongArtist: { fontSize: 11, color: C.textMuted, marginTop: 1 },
  hojeTomBadge: { alignItems: 'center', backgroundColor: C.primaryDim, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, minWidth: 40 },
  hojeTomLabel: { fontSize: 8, color: C.primary, fontWeight: '700', letterSpacing: 0.5 },
  hojeTomValue: { fontSize: 14, fontWeight: '800', color: C.primary },
  hojeBpmBadge: { alignItems: 'center', backgroundColor: C.surfaceHigh, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, minWidth: 44 },
  hojeBpmLabel: { fontSize: 8, color: C.textMuted, fontWeight: '700', letterSpacing: 0.5 },
  hojeBpmValue: { fontSize: 14, fontWeight: '800', color: C.textMuted },
  hojeSpotify: { width: 28, height: 28, borderRadius: 6, backgroundColor: C.accentDim, alignItems: 'center', justifyContent: 'center' },
  hojeTip: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  hojeTipText: { fontSize: 11, color: C.textDim },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingTop: 80 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.textMuted, marginTop: 16, marginBottom: 8 },
  emptyDesc: { fontSize: 13, color: C.textDim, textAlign: 'center', lineHeight: 20 },
  emptyBtn: { marginTop: 20, backgroundColor: C.primary, paddingVertical: 10, paddingHorizontal: 24, borderRadius: 20 },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  // Repertório
  reperToolbar: { flexDirection: 'row', alignItems: 'center', paddingRight: 16 },
  filterRow: { flex: 1, flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  pill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  pillActive: { backgroundColor: C.primaryDim, borderColor: C.primary },
  pillText: { fontSize: 13, color: C.textMuted, fontWeight: '500' },
  pillTextActive: { color: C.primary, fontWeight: '700' },
  addSongBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  songCard: { backgroundColor: C.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.border, flexDirection: 'row', alignItems: 'center' },
  keyBadge: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  keyText: { fontSize: 14, fontWeight: '800' },
  songTitle: { fontSize: 14, fontWeight: '700', color: C.text },
  songArtist: { fontSize: 12, color: C.textMuted, marginTop: 1 },
  songMeta: { flexDirection: 'row', gap: 6, marginTop: 5 },
  songMetaChip: { backgroundColor: C.surfaceHigh, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  songMetaText: { fontSize: 10, color: C.textMuted, fontWeight: '600' },
  songLinks: { flexDirection: 'row', gap: 6, marginLeft: 8 },
  linkBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: C.surfaceHigh, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  linkBtnMini: { width: 28, height: 28, borderRadius: 7 },
  songTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  linkBtnLabel: { fontSize: 9, fontWeight: '800', color: C.textMuted },
  linkBtnYt: { backgroundColor: '#1a0000', borderColor: '#FF000040' },
  linkBtnDisabled: { opacity: 0.4 },
  spotifyBtn: { backgroundColor: C.accentDim },
  spotifyBtnDisabled: { opacity: 0.4 },
  // Cultos
  cultosToolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  cultosCount: { fontSize: 13, color: C.textMuted, fontWeight: '500' },
  newCultoBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.primary, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20 },
  newCultoBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  cultoCard: { backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border, marginBottom: 12, overflow: 'hidden' },
  cultoCardOpen: { borderColor: C.primary },
  cultoHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  cultoHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  cultoDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.primary },
  cultoLabel: { fontSize: 15, fontWeight: '700', color: C.text },
  cultoMeta: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  cultoHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  deleteBtn: { padding: 4 },
  cultoSongs: { borderTopWidth: 1, borderTopColor: C.border, paddingHorizontal: 14, paddingTop: 6, paddingBottom: 10, backgroundColor: C.surfaceHigh },
  cultoColHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  cultoColLabel: { fontSize: 9, color: C.textDim, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  cultoSongRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  cultoSongNum: { fontSize: 11, color: C.textDim, fontWeight: '700', width: 16, textAlign: 'center' },
  cultoKeyBadge: { width: 28, height: 28, borderRadius: 6, backgroundColor: C.primaryDim, alignItems: 'center', justifyContent: 'center' },
  cultoKeyText: { fontSize: 11, fontWeight: '800', color: C.primary },
  cultoSongTitle: { fontSize: 13, fontWeight: '600', color: C.text },
  cultoSongArtist: { fontSize: 11, color: C.textMuted },
  cultoBpmChip: { backgroundColor: C.surfaceHigh, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, minWidth: 40, alignItems: 'center' },
  cultoBpmText: { fontSize: 12, fontWeight: '700', color: C.textMuted },
  spotifyMini: { width: 28, height: 28, borderRadius: 6, backgroundColor: C.accentDim, alignItems: 'center', justifyContent: 'center' },
  // Escala
  escalaCard: { backgroundColor: C.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.border },
  escalaHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, marginBottom: 6 },
  escalaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  escalaNome: { flex: 1, fontSize: 13, fontWeight: '600', color: C.text },
  escalaInstChip: { backgroundColor: C.primaryDim, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  escalaInstText: { fontSize: 11, fontWeight: '700', color: C.primary },
  escalaVazia: { fontSize: 12, color: C.textDim, paddingVertical: 4 },
  // Ensaios
  ensaioCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: C.surface, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  ensaioDate: { width: 48, alignItems: 'center', marginRight: 14, backgroundColor: C.primaryDim, borderRadius: 10, paddingVertical: 8 },
  ensaioDay: { fontSize: 22, fontWeight: '800', color: C.primary, lineHeight: 24 },
  ensaioMonth: { fontSize: 11, color: C.primary, fontWeight: '600', textTransform: 'uppercase' },
  ensaioInfo: { flex: 1 },
  ensaioTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  ensaioLocalRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  ensaioLocal: { fontSize: 12, color: C.textMuted },
  obsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginTop: 6 },
  obsText: { fontSize: 12, color: C.primary, flex: 1 },
  confirmBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.accentDim, alignItems: 'center', justifyContent: 'center' },
  // Chat
  chatContent: { padding: 16, paddingBottom: 8 },
  bubble: { alignSelf: 'flex-start', maxWidth: '80%', backgroundColor: C.surface, borderRadius: 12, borderBottomLeftRadius: 4, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  bubbleMine: { alignSelf: 'flex-end', backgroundColor: C.primaryDim, borderBottomLeftRadius: 12, borderBottomRightRadius: 4, borderColor: C.primary },
  bubbleAuthor: { fontSize: 11, color: C.primary, fontWeight: '700', marginBottom: 4 },
  bubbleText: { fontSize: 14, color: C.text, lineHeight: 20 },
  bubbleTextMine: { color: '#E8E0FF' },
  bubbleTime: { fontSize: 10, color: C.textDim, marginTop: 4, textAlign: 'right' },
  bubbleTimeMine: { color: 'rgba(200,180,255,0.6)' },
  chatInput: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.surface },
  chatField: { flex: 1, height: 42, backgroundColor: C.surfaceHigh, borderRadius: 21, paddingHorizontal: 16, fontSize: 14, color: C.text, borderWidth: 1, borderColor: C.border },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
});

// ─── Root Export ──────────────────────────────────────────────────────────────
export default function BandaScreen() {
  const { user } = useAuth();
  const [unlocked, setUnlocked] = useState(false);
  const [checandoAcesso, setChecandoAcesso] = useState(true);

  useEffect(() => {
    if (!user) { setChecandoAcesso(false); return; }
    supabase.from('profiles').select('banda_acesso').eq('id', user.id).single()
      .then(({ data }) => {
        setUnlocked(!!data?.banda_acesso);
        setChecandoAcesso(false);
      });
  }, [user]);

  if (checandoAcesso) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.primary} />
      </SafeAreaView>
    );
  }

  return unlocked ? <BandaMain /> : <InviteGate onUnlock={() => setUnlocked(true)} />;
}
