import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert, TextInput, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../lib/theme';
import { PlatformPayButton, usePlatformPay, PlatformPay } from '@stripe/stripe-react-native';
import { supabase } from '../lib/supabase';

// Paleta local — header, card do valor e card do versículo já são roxo
// escuro por design e funcionam nos dois temas sem mudar. Só os blocos
// "claros" (cards brancos de tipo/recorrência/resumo e o fundo da tela)
// precisam inverter no modo escuro.
function paletaOferta(isDark: boolean) {
  return isDark ? {
    bg: '#0E0B22',
    cardBg: '#1C1940',
    cardBorder: '#332D5C',
    textPrimary: '#F1EFFA',
    textMuted: '#A69FD6',
    cardAtivoBg: '#2A2560',
    abasBg: '#241F4D',
  } : {
    bg: '#F9F8FF',
    cardBg: '#FFFFFF',
    cardBorder: 'rgba(83,74,183,0.13)',
    textPrimary: '#1A1740',
    textMuted: '#8B83D4',
    cardAtivoBg: '#EEEDFE',
    abasBg: '#EEEDFE',
  };
}
type PaletaOferta = ReturnType<typeof paletaOferta>;

// ─── Config ───────────────────────────────────────────────────────────────────
const SUMUP_URL = 'https://pay.sumup.com/b2c/Q54Q9ILX';

const valores = [10, 25, 50, 100, 200];

export default function OfertaScreen({ navigation }: { navigation?: any }) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const C = useMemo(() => paletaOferta(isDark), [isDark]);
  const styles = useMemo(() => buildStyles(C), [C]);
  const tipos = [
    { id: 'dizimo', nome: t('oferta.dizimoNome'), sub: t('oferta.dizimoSub'), icone: 'star-outline' },
    { id: 'oferta', nome: t('oferta.ofertaNome'), sub: t('oferta.ofertaSub'), icone: 'heart-outline' },
    // Missões e Construção voltam quando tivermos essas campanhas ativas.
  ];
  const [valorSelecionado, setValorSelecionado] = useState(25);
  const [outroAtivo, setOutroAtivo] = useState(false);
  const [valorCustom, setValorCustom] = useState('');
  const [tipoSelecionado, setTipoSelecionado] = useState('dizimo');
  const [recorrencia, setRecorrencia] = useState('unica');

  // ─── Apple Pay / Google Pay via Stripe ────────────────────────────────────
  // Mostramos o botão sempre (para quem está no iOS/Android), independente
  // de canMakePayments/isPlatformPaySupported — esse check exige cartão já
  // configurado na Wallet do dispositivo, o que faz o botão sumir em
  // dispositivos "limpos" (incluindo o do revisor da Apple). Se o usuário
  // tocar sem ter Apple/Google Pay configurado, o erro é tratado no catch
  // de handlePlatformPay com um Alert amigável.
  const { confirmPlatformPayPayment } = usePlatformPay();
  const [processandoPagamento, setProcessandoPagamento] = useState(false);

  const valorFinal = outroAtivo ? Number(valorCustom.replace(',', '.')) || 0 : valorSelecionado;

  const selecionarPreset = (v: number) => {
    setOutroAtivo(false);
    setValorSelecionado(v);
  };

  const selecionarOutro = () => {
    setOutroAtivo(true);
    setValorSelecionado(0);
  };

  const handleContribuir = () => {
    if (valorFinal <= 0) {
      Alert.alert(t('common.atencao'), t('oferta.informeValorValido'));
      return;
    }
    Alert.alert(
      t('oferta.modalTitulo'),
      t('oferta.modalTexto', {
        valor: valorFinal,
        tipo: tipos.find(tp => tp.id === tipoSelecionado)?.nome,
        freq: recorrencia === 'mensal' ? t('oferta.mensal') : t('oferta.unica'),
      }),
      [
        { text: t('common.cancelar'), style: 'cancel' },
        { text: t('oferta.irParaPagamento'), onPress: () => Linking.openURL(SUMUP_URL) },
      ]
    );
  };

  // Busca o client_secret na Edge Function e confirma o pagamento via Apple/Google Pay.
  const handlePlatformPay = async () => {
    if (valorFinal <= 0) {
      Alert.alert(t('common.atencao'), t('oferta.informeValorValido'));
      return;
    }

    setProcessandoPagamento(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('create-payment-intent', {
        body: { valor: valorFinal, tipo: tipoSelecionado, moeda: 'gbp' },
      });

      if (fnError || !data?.clientSecret) {
        throw new Error(fnError?.message || 'Não foi possível iniciar o pagamento.');
      }

      const { error: confirmError } = await confirmPlatformPayPayment(data.clientSecret, {
        applePay: {
          cartItems: [
            {
              label: 'Peniel Church',
              amount: valorFinal.toFixed(2),
              paymentType: PlatformPay.PaymentType.Immediate,
            },
          ],
          merchantCountryCode: 'GB',
          currencyCode: 'GBP',
        },
        googlePay: {
          testEnv: false,
          merchantName: 'Peniel Church',
          merchantCountryCode: 'GB',
          currencyCode: 'GBP',
        },
      });

      if (confirmError) {
        if (confirmError.code !== 'Canceled') {
          Alert.alert(t('common.atencao'), confirmError.message);
        }
        return;
      }

      Alert.alert(t('oferta.modalTitulo'), t('oferta.pagamentoConfirmado') || 'Contribuição recebida. Obrigado!');
    } catch (e: any) {
      Alert.alert(t('common.atencao'), e?.message || 'Erro ao processar pagamento.');
    } finally {
      setProcessandoPagamento(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSub}>{t('oferta.contribuaComAObra')}</Text>
          <Text style={styles.headerTitulo}>{t('oferta.titulo')}</Text>
        </View>
        {navigation && (
          <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Valor ─────────────────────────────────────────────────────────── */}
        <View style={styles.valorCard}>
          <Text style={styles.valorLabel}>{t('oferta.valorDaOferta')}</Text>
          <Text style={styles.valorDisplay}>
            {valorFinal > 0 ? '£ ' + valorFinal : '£ --'}
          </Text>
          <View style={styles.presetsGrid}>
            {valores.map((v) => (
              <TouchableOpacity
                key={v}
                style={[styles.presetBtn, !outroAtivo && valorSelecionado === v && styles.presetBtnAtivo]}
                onPress={() => selecionarPreset(v)}
              >
                <Text style={[styles.presetTexto, !outroAtivo && valorSelecionado === v && styles.presetTextoAtivo]}>
                  £{v}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.presetBtn, outroAtivo && styles.presetBtnAtivo]}
              onPress={selecionarOutro}
            >
              <Text style={[styles.presetTexto, outroAtivo && styles.presetTextoAtivo]}>
                {t('oferta.outro')}
              </Text>
            </TouchableOpacity>
          </View>
          {outroAtivo && (
            <View style={styles.outroInputWrap}>
              <Text style={styles.outroInputPrefixo}>£</Text>
              <TextInput
                style={styles.outroInput}
                value={valorCustom}
                onChangeText={setValorCustom}
                placeholder="0.00"
                placeholderTextColor="rgba(255,255,255,0.35)"
                keyboardType="decimal-pad"
                autoFocus
              />
            </View>
          )}
        </View>

        {/* ── Tipo ──────────────────────────────────────────────────────────── */}
        <Text style={styles.secaoTitulo}>{t('oferta.tipoDeContribuicao')}</Text>
        <View style={styles.tiposGrid}>
          {tipos.map((tipo) => (
            <TouchableOpacity
              key={tipo.id}
              style={[styles.tipoCard, tipoSelecionado === tipo.id && styles.tipoCardAtivo]}
              onPress={() => setTipoSelecionado(tipo.id)}
            >
              <Ionicons
                name={tipo.icone as any}
                size={20}
                color={tipoSelecionado === tipo.id ? '#534AB7' : C.textMuted}
              />
              <Text style={[styles.tipoNome, tipoSelecionado === tipo.id && styles.tipoNomeAtivo]}>
                {tipo.nome}
              </Text>
              <Text style={styles.tipoSub}>{tipo.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Recorrência ───────────────────────────────────────────────────── */}
        <View style={styles.recorrenciaCard}>
          <View style={styles.recorrenciaTop}>
            <Text style={styles.recorrenciaTitulo}>{t('oferta.frequencia')}</Text>
            <View style={styles.recorrenciaAbas}>
              <TouchableOpacity
                style={[styles.recorrenciaAba, recorrencia === 'unica' && styles.recorrenciaAbaAtiva]}
                onPress={() => setRecorrencia('unica')}
              >
                <Text style={[styles.recorrenciaAbaTexto, recorrencia === 'unica' && styles.recorrenciaAbaTextoAtivo]}>
                  {t('oferta.unica')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.recorrenciaAba, recorrencia === 'mensal' && styles.recorrenciaAbaAtiva]}
                onPress={() => setRecorrencia('mensal')}
              >
                <Text style={[styles.recorrenciaAbaTexto, recorrencia === 'mensal' && styles.recorrenciaAbaTextoAtivo]}>
                  {t('oferta.mensal')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.recorrenciaDesc}>
            {recorrencia === 'mensal'
              ? t('oferta.freqMensalDesc')
              : t('oferta.freqUnicaDesc')}
          </Text>
        </View>

        {/* ── Resumo ────────────────────────────────────────────────────────── */}
        <View style={styles.resumoCard}>
          <View style={styles.resumoLinha}>
            <Text style={styles.resumoLabel}>{t('oferta.resumoTipo')}</Text>
            <Text style={styles.resumoValor}>{tipos.find(tp => tp.id === tipoSelecionado)?.nome}</Text>
          </View>
          <View style={styles.resumoLinha}>
            <Text style={styles.resumoLabel}>{t('oferta.resumoValor')}</Text>
            <Text style={[styles.resumoValor, { color: '#534AB7', fontWeight: '700' }]}>
              {valorFinal > 0 ? '£ ' + valorFinal : t('oferta.aDefinir')}
            </Text>
          </View>
          <View style={[styles.resumoLinha, { borderBottomWidth: 0 }]}>
            <Text style={styles.resumoLabel}>{t('oferta.frequencia')}</Text>
            <Text style={styles.resumoValor}>{recorrencia === 'mensal' ? t('oferta.todoMes') : t('oferta.umaVez')}</Text>
          </View>
        </View>

        {/* ── Apple Pay / Google Pay ───────────────────────────────────────────
             Aparece sempre para contribuição única (recorrência mensal
             continua via SumUp), independente de haver cartão configurado
             na Wallet — ver nota acima sobre isPlatformPaySupported. */}
        {recorrencia === 'unica' && (
          <PlatformPayButton
            onPress={handlePlatformPay}
            type={PlatformPay.ButtonType.Donate}
            appearance={PlatformPay.ButtonStyle.Black}
            borderRadius={14}
            disabled={processandoPagamento}
            style={styles.platformPayBtn}
          />
        )}

        {/* ── Botão contribuir (SumUp) ──────────────────────────────────────── */}
        <TouchableOpacity style={styles.btnContribuir} onPress={handleContribuir} activeOpacity={0.85}>
          <Ionicons name="card-outline" size={20} color="#fff" />
          <Text style={styles.btnContribuirTexto}>{t('oferta.contribuirComSeguranca')}</Text>
        </TouchableOpacity>

        {/* ── Selos de segurança ────────────────────────────────────────────── */}
        <View style={styles.selosRow}>
          <View style={styles.selo}>
            <Ionicons name="lock-closed-outline" size={14} color="#8B83D4" />
            <Text style={styles.seloTexto}>{t('oferta.ssl')}</Text>
          </View>
          <View style={styles.selo}>
            <Ionicons name="shield-checkmark-outline" size={14} color="#8B83D4" />
            <Text style={styles.seloTexto}>{t('oferta.sumupSeguro')}</Text>
          </View>
          <View style={styles.selo}>
            <Ionicons name="card-outline" size={14} color="#8B83D4" />
            <Text style={styles.seloTexto}>{t('oferta.visaMastercard')}</Text>
          </View>
        </View>

        {/* ── Versículo ─────────────────────────────────────────────────────── */}
        <View style={styles.versiculoCard}>
          <Text style={styles.versiculoTexto}>
            {t('oferta.versiculoOferta')}
          </Text>
          <Text style={styles.versiculoRef}>{t('oferta.versiculoRef')}</Text>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

function buildStyles(C: PaletaOferta) { return StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { backgroundColor: '#1A1740', paddingTop: 55, paddingBottom: 16, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  headerTitulo: { fontSize: 18, fontWeight: '500', color: '#fff', marginTop: 2 },
  // Valor
  valorCard: { backgroundColor: '#1A1740', margin: 14, borderRadius: 16, padding: 20 },
  valorLabel: { fontSize: 12, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: 8 },
  valorDisplay: { fontSize: 48, fontWeight: '700', color: '#F5C842', textAlign: 'center', marginBottom: 20 },
  presetsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  presetBtn: { backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, minWidth: 70, alignItems: 'center' },
  presetBtnAtivo: { backgroundColor: '#534AB7', borderColor: '#534AB7' },
  presetTexto: { fontSize: 15, fontWeight: '500', color: 'rgba(255,255,255,0.7)' },
  presetTextoAtivo: { color: '#fff', fontWeight: '700' },
  outroInputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: '#534AB7', borderRadius: 10, paddingHorizontal: 14, height: 46, marginTop: 12 },
  outroInputPrefixo: { fontSize: 16, fontWeight: '700', color: '#F5C842', marginRight: 8 },
  outroInput: { flex: 1, fontSize: 16, color: '#fff', fontWeight: '600' },
  // Tipos
  secaoTitulo: { fontSize: 14, fontWeight: '500', color: C.textPrimary, marginHorizontal: 14, marginBottom: 10 },
  tiposGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginHorizontal: 14, marginBottom: 16 },
  tipoCard: { backgroundColor: C.cardBg, borderRadius: 14, borderWidth: 0.5, borderColor: C.cardBorder, padding: 14, width: '47%', gap: 5 },
  tipoCardAtivo: { borderWidth: 1.5, borderColor: '#534AB7', backgroundColor: C.cardAtivoBg },
  tipoNome: { fontSize: 13, fontWeight: '500', color: C.textPrimary },
  tipoNomeAtivo: { color: '#534AB7' },
  tipoSub: { fontSize: 11, color: C.textMuted },
  // Recorrência
  recorrenciaCard: { backgroundColor: C.cardBg, borderRadius: 14, borderWidth: 0.5, borderColor: C.cardBorder, padding: 14, marginHorizontal: 14, marginBottom: 16 },
  recorrenciaTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  recorrenciaTitulo: { fontSize: 13, fontWeight: '500', color: C.textPrimary },
  recorrenciaAbas: { flexDirection: 'row', backgroundColor: C.abasBg, borderRadius: 8, overflow: 'hidden' },
  recorrenciaAba: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  recorrenciaAbaAtiva: { backgroundColor: '#534AB7' },
  recorrenciaAbaTexto: { fontSize: 12, fontWeight: '500', color: C.textMuted },
  recorrenciaAbaTextoAtivo: { color: '#fff' },
  recorrenciaDesc: { fontSize: 12, color: C.textMuted, lineHeight: 18 },
  // Resumo
  resumoCard: { backgroundColor: C.cardBg, borderRadius: 14, borderWidth: 0.5, borderColor: C.cardBorder, marginHorizontal: 14, marginBottom: 16, overflow: 'hidden' },
  resumoLinha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 0.5, borderBottomColor: C.cardBorder },
  resumoLabel: { fontSize: 13, color: C.textMuted },
  resumoValor: { fontSize: 13, fontWeight: '500', color: C.textPrimary },
  // Apple/Google Pay
  platformPayBtn: { height: 50, marginHorizontal: 14, marginBottom: 12 },
  // Botão
  btnContribuir: { backgroundColor: '#534AB7', borderRadius: 14, marginHorizontal: 14, padding: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10 },
  btnContribuirTexto: { fontSize: 16, fontWeight: '700', color: '#fff' },
  // Selos
  selosRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 12, marginBottom: 16 },
  selo: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  seloTexto: { fontSize: 11, color: C.textMuted },
  // Versículo
  versiculoCard: { backgroundColor: '#1A1740', borderRadius: 16, marginHorizontal: 14, padding: 18 },
  versiculoTexto: { fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 20, fontStyle: 'italic' },
  versiculoRef: { fontSize: 11, color: '#F5C842', marginTop: 8 },
}); }