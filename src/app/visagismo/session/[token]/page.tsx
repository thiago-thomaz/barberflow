'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Scissors,
  Camera,
  Upload,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Share2,
  Download,
  Calendar,
  MessageSquare,
  Trash2,
  HelpCircle,
  ShieldCheck,
  RotateCcw,
  Star,
  Check,
} from 'lucide-react';
import { Modal } from '@/components/UI/Modal';
import { Badge } from '@/components/UI/Badge';

export default function VisagismoSessionPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [session, setSession] = useState<any | null>(null);
  const [guides, setGuides] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [step, setStep] = useState<number>(1);

  // Step 2: Photo & Consent
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [consent, setConsent] = useState<boolean>(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 3 & 4 & 5: Profile questionnaire
  const [objective, setObjective] = useState<string>('Corte + Barba');
  const [style, setStyle] = useState<string>('Moderno');
  const [changeLevel, setChangeLevel] = useState<string>('Medio');
  const [maintenanceLevel, setMaintenanceLevel] = useState<string>('Medio');
  const [hairLength, setHairLength] = useState<string>('Tanto faz');
  const [faceShape, setFaceShape] = useState<string>('Oval');
  const [aiDetectedShape, setAiDetectedShape] = useState<string | null>(null);
  const [aiNotes, setAiNotes] = useState<string | null>(null);
  const [colorPreference, setColorPreference] = useState<string>('Natural');

  // Face Shape Info Modal
  const [isFaceModalOpen, setIsFaceModalOpen] = useState(false);

  // Evaluation results
  const [evaluating, setEvaluating] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [selectedRecIndex, setSelectedRecIndex] = useState<number>(0);

  // Share & Action states
  const [sharing, setSharing] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);

  // Load Session
  useEffect(() => {
    async function loadSession() {
      try {
        setLoading(true);
        const res = await fetch(`/api/visagismo/session/${token}`);
        const data = await res.json();
        if (res.ok && data.session) {
          setSession(data.session);
          setGuides(data.guides);

          if (data.session.hasPhoto) {
            setPhotoPreview(`/api/visagismo/session/${token}/photo`);
          }

          if (data.session.profile) {
            setObjective(data.session.profile.objective || 'Corte + Barba');
            setStyle(data.session.profile.style || 'Moderno');
            setChangeLevel(data.session.profile.changeLevel || 'Medio');
            setMaintenanceLevel(data.session.profile.maintenanceLevel || 'Medio');
            setHairLength(data.session.profile.hairLength || 'Tanto faz');
            setFaceShape(data.session.profile.faceShape || 'Oval');
            setColorPreference(data.session.profile.colorPreference || 'Natural');
          }

          if (data.session.recommendations && data.session.recommendations.length > 0) {
            setRecommendations(data.session.recommendations);
            setStep(6); // Go to results if already evaluated
          }
        } else {
          setError(data.error || 'Sessão não encontrada ou expirada');
        }
      } catch (err) {
        console.error(err);
        setError('Erro ao conectar ao servidor');
      } finally {
        setLoading(false);
      }
    }
    if (token) loadSession();
  }, [token]);

  // Handle Photo Selection
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('A foto deve ter no máximo 5MB.');
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotoPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload Photo with Consent
  const handleUploadPhoto = async () => {
    if (!consent) {
      alert('Por favor, confirme o consentimento para prosseguir.');
      return;
    }

    if (!photoFile && !photoPreview) {
      // Allow proceeding without photo if user prefers questionnaire only
      setStep(3);
      return;
    }

    if (photoFile) {
      setUploadingPhoto(true);
      try {
        const formData = new FormData();
        formData.append('photo', photoFile);
        formData.append('consent', 'true');

        const res = await fetch(`/api/visagismo/session/${token}/photo`, {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro no upload');

        if (data.detectedFaceShape) {
          setFaceShape(data.detectedFaceShape);
          setAiDetectedShape(data.detectedFaceShape);
        }
        if (data.notes) {
          setAiNotes(data.notes);
        }
      } catch (err: any) {
        alert(err.message);
        setUploadingPhoto(false);
        return;
      } finally {
        setUploadingPhoto(false);
      }
    }

    setStep(3);
  };

  // Delete Photo
  const handleDeletePhoto = async () => {
    if (!confirm('Deseja realmente excluir sua foto? Ela será apagada permanentemente do servidor.')) return;
    try {
      await fetch(`/api/visagismo/session/${token}/photo`, { method: 'DELETE' });
      setPhotoPreview(null);
      setPhotoFile(null);
      alert('Foto excluída com sucesso.');
    } catch (err) {
      alert('Erro ao excluir foto.');
    }
  };

  // Submit Profile & Generate Recommendations
  const handleEvaluate = async () => {
    setEvaluating(true);
    try {
      const res = await fetch(`/api/visagismo/session/${token}/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objective,
          style,
          changeLevel,
          maintenanceLevel,
          hairLength,
          faceShape,
          colorPreference,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao avaliar perfil');

      setRecommendations(data.evaluation.recommendations);
      setSelectedRecIndex(0);
      setStep(6); // Step 6: Resultados
    } catch (err: any) {
      alert(err.message);
    } finally {
      setEvaluating(false);
    }
  };

  // Action: Save / Share
  const handleSelectAndAction = async (actionType: 'SAVE' | 'APPOINTMENT' | 'WHATSAPP') => {
    const selectedRec = recommendations[selectedRecIndex];
    if (!selectedRec) return;

    try {
      const res = await fetch(`/api/visagismo/session/${token}/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recommendationId: selectedRec.id,
          haircutName: selectedRec.haircutName,
          haircutStyle: selectedRec.haircutStyle,
          beardName: selectedRec.beardName,
          hairColor: selectedRec.hairColor,
          action:
            actionType === 'APPOINTMENT'
              ? 'APPOINTMENT_CLICKED'
              : actionType === 'WHATSAPP'
              ? 'WHATSAPP_SHARED'
              : 'STYLE_SAVED',
        }),
      });

      const data = await res.json();

      if (actionType === 'WHATSAPP' && data.whatsappUrl) {
        window.open(data.whatsappUrl, '_blank');
      } else if (actionType === 'APPOINTMENT' && data.bookingUrl) {
        router.push(data.bookingUrl);
      } else if (actionType === 'SAVE') {
        if (navigator.share) {
          try {
            await navigator.share({
              title: `Meu Novo Visual - ${session?.barbershop?.name || 'BarberFlow'}`,
              text: `Meu novo estilo no BarberFlow:\n✂️ Corte: ${selectedRec.haircutName}\n💈 Estilo: ${selectedRec.haircutStyle}\n🧔 Barba: ${selectedRec.beardName || 'Alinhada'}`,
              url: window.location.href,
            });
          } catch (e) {
            // Share dismissed
          }
        }
        setSavedFeedback(true);
        setTimeout(() => setSavedFeedback(false), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0D0F12] text-zinc-400 text-sm">
        <div className="text-center space-y-3">
          <Scissors className="h-8 w-8 text-amber-500 animate-spin mx-auto" />
          <p>Carregando Consultor de Visagismo...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0D0F12] p-6 text-center text-zinc-300">
        <AlertTriangle className="h-12 w-12 text-amber-500 mb-3" />
        <h1 className="text-xl font-bold text-white">Sessão Expirada ou Inválida</h1>
        <p className="text-xs text-zinc-400 mt-2 max-w-sm">
          {error || 'Este link expirou por segurança. Solicite um novo link pelo WhatsApp da barbearia.'}
        </p>
      </div>
    );
  }

  const shop = session.barbershop;

  return (
    <div className="min-h-screen bg-[#0D0F12] text-zinc-100 flex flex-col items-center px-4 py-6 sm:py-10">
      <div className="w-full max-w-lg space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
            <Scissors className="h-3.5 w-3.5" />
            <span>Consultor de Visagismo • {shop?.name}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase">
            Mude seu Visual
          </h1>
          <p className="text-xs text-zinc-400 max-w-xs mx-auto">
            Descubra cortes, barbas e estilos que harmonizam com suas proporções.
          </p>
        </div>

        {/* Progress Bar (Steps 1 to 6) */}
        <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-amber-500 to-amber-400 h-full transition-all duration-300"
            style={{ width: `${(step / 6) * 100}%` }}
          />
        </div>

        {/* ========================================================================= */}
        {/* STEP 1: BOAS-VINDAS */}
        {/* ========================================================================= */}
        {step === 1 && (
          <div className="bg-[#14171F] border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 text-center shadow-2xl">
            <div className="h-20 w-20 mx-auto rounded-full bg-gradient-to-tr from-amber-500/20 to-amber-400/5 flex items-center justify-center border border-amber-500/30">
              <Sparkles className="h-10 w-10 text-amber-400" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">Pronto para uma nova versão?</h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Em menos de 2 minutos vamos analisar suas preferências de rotina, formato facial e estilo para indicar os 3 melhores visuais para você.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-left">
              <div className="bg-zinc-900/60 p-3 rounded-2xl border border-zinc-800/80">
                <span className="text-xl">📐</span>
                <p className="text-[11px] font-semibold text-white mt-1">Harmonia</p>
                <p className="text-[10px] text-zinc-500">Proporções faciais</p>
              </div>
              <div className="bg-zinc-900/60 p-3 rounded-2xl border border-zinc-800/80">
                <span className="text-xl">⏱️</span>
                <p className="text-[11px] font-semibold text-white mt-1">Praticidade</p>
                <p className="text-[10px] text-zinc-500">Tempo de rotina</p>
              </div>
              <div className="bg-zinc-900/60 p-3 rounded-2xl border border-zinc-800/80">
                <span className="text-xl">💈</span>
                <p className="text-[11px] font-semibold text-white mt-1">Execução</p>
                <p className="text-[10px] text-zinc-500">Direto no barbeiro</p>
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
            >
              <span>Começar Visagismo</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: FOTO & CONSENTIMENTO */}
        {/* ========================================================================= */}
        {step === 2 && (
          <div className="bg-[#14171F] border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="space-y-1 text-center">
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Passo 1 de 5</span>
              <h2 className="text-xl font-bold text-white">Sua Foto de Rosto</h2>
              <p className="text-xs text-zinc-400">
                Tire uma selfie de frente com boa iluminação ou escolha da galeria.
              </p>
            </div>

            {/* Photo Preview / Upload Area */}
            <div className="flex flex-col items-center">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoChange}
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
              />

              {photoPreview ? (
                <div className="relative group">
                  <div className="h-44 w-44 rounded-3xl overflow-hidden border-2 border-amber-500/50 shadow-xl bg-black">
                    <img src={photoPreview} alt="Sua Foto" className="h-full w-full object-cover" />
                  </div>
                  <button
                    onClick={handleDeletePhoto}
                    className="absolute -top-2 -right-2 p-2 bg-red-600 hover:bg-red-500 text-white rounded-full shadow-lg transition-transform hover:scale-110"
                    title="Excluir Foto"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="h-44 w-44 rounded-3xl border-2 border-dashed border-zinc-700 hover:border-amber-500 flex flex-col items-center justify-center p-4 cursor-pointer bg-zinc-900/40 hover:bg-zinc-900/80 transition-all text-center space-y-2 group"
                >
                  <div className="p-3 rounded-2xl bg-zinc-800 group-hover:bg-amber-500/20 text-zinc-400 group-hover:text-amber-400 transition-colors">
                    <Camera className="h-8 w-8" />
                  </div>
                  <span className="text-xs font-semibold text-zinc-300">Tirar ou Enviar Foto</span>
                  <span className="text-[10px] text-zinc-500">JPG, PNG ou WebP (max 5MB)</span>
                </div>
              )}
            </div>

            {/* Consentimento LGPD */}
            <div className="bg-zinc-900/80 p-4 rounded-2xl border border-zinc-800 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded bg-zinc-800 border-zinc-700 text-amber-500 focus:ring-amber-500 focus:ring-offset-0"
                />
                <div className="text-[11px] text-zinc-300 leading-tight">
                  <span className="font-semibold text-white">Privacidade & Consentimento (LGPD):</span> Concordo em utilizar minha foto exclusivamente para esta experiência de visagismo.
                </div>
              </label>
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                <span>Sua foto é privada, expira em 24h e pode ser excluída a qualquer momento.</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-3.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={handleUploadPhoto}
                disabled={uploadingPhoto || (!photoPreview && !photoFile)}
                className="flex-1 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
              >
                {uploadingPhoto ? (
                  <span>Salvando foto...</span>
                ) : (
                  <>
                    <span>{photoPreview ? 'Continuar com a Foto' : 'Continuar'}</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: PERFIL DE VISAGISMO (5 PERGUNTAS) */}
        {/* ========================================================================= */}
        {step === 3 && (
          <div className="bg-[#14171F] border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="space-y-1 text-center">
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Passo 2 de 5</span>
              <h2 className="text-xl font-bold text-white">Suas Preferências</h2>
              <p className="text-xs text-zinc-400">Personalize o resultado para sua rotina e gosto.</p>
            </div>

            <div className="space-y-4 text-xs">
              {/* Pergunta 1: Objetivo */}
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-300">1. O que você gostaria de mudar?</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Corte', 'Barba', 'Corte + Barba', 'Cor', 'Estilo completo', 'Nao sei'].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setObjective(opt)}
                      className={`p-2.5 rounded-xl border text-center font-medium transition-all ${
                        objective === opt
                          ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                      }`}
                    >
                      {opt === 'Corte + Barba' ? 'Corte + Barba' : opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pergunta 2: Estilo */}
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-300">2. Qual estilo você mais se identifica?</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Classico', 'Moderno', 'Executivo', 'Casual', 'Despojado', 'Degrade'].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setStyle(opt)}
                      className={`p-2.5 rounded-xl border text-center font-medium transition-all ${
                        style === opt
                          ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pergunta 3: Nível de Mudança */}
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-300">3. Quanto você quer mudar?</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'Pouco', label: 'Pouco (Sutil)' },
                    { id: 'Medio', label: 'Médio (Equilibrado)' },
                    { id: 'Radical', label: 'Radical (Transformação)' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setChangeLevel(opt.id)}
                      className={`p-2.5 rounded-xl border text-center font-medium transition-all ${
                        changeLevel === opt.id
                          ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pergunta 4: Manutenção Diária */}
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-300">4. Tempo diário para arrumar o cabelo:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'Pouco', label: '⚡ Quase nada (Prático)' },
                    { id: 'Medio', label: '👌 5 a 10 minutos' },
                    { id: 'Bastante', label: '✨ Gosto de modelar' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setMaintenanceLevel(opt.id)}
                      className={`p-2.5 rounded-xl border text-center font-medium transition-all ${
                        maintenanceLevel === opt.id
                          ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pergunta 5: Manter Comprimento */}
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-300">5. Quer manter o comprimento atual?</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Sim', 'Nao', 'Tanto faz'].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setHairLength(opt)}
                      className={`p-2.5 rounded-xl border text-center font-medium transition-all ${
                        hairLength === opt
                          ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                      }`}
                    >
                      {opt === 'Nao' ? 'Não (Quero mais curto)' : opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-3.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={() => setStep(4)}
                className="flex-1 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
              >
                <span>Próximo: Formato do Rosto</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 4: FORMATO DE ROSTO */}
        {/* ========================================================================= */}
        {step === 4 && (
          <div className="bg-[#14171F] border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="space-y-1 text-center">
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Passo 3 de 5</span>
              <h2 className="text-xl font-bold text-white">Formato do seu Rosto</h2>
              <p className="text-xs text-zinc-400">
                Selecione o formato que mais se aproxima do seu rosto.
              </p>
              {aiDetectedShape && (
                <div className="mt-3 p-3 rounded-2xl bg-gradient-to-r from-amber-500/15 to-amber-400/5 border border-amber-500/30 text-left flex items-start gap-2.5">
                  <Sparkles className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-[11px] text-zinc-300">
                    <p className="font-bold text-amber-400">Identificado pelo Google Gemini Vision:</p>
                    <p className="text-zinc-300">{aiNotes || `Seu formato predominante detectado foi ${aiDetectedShape}. Você pode confirmar ou alterar abaixo.`}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              {[
                { id: 'Oval', label: 'Oval', icon: '🥚', desc: 'Proporcional e equilibrado' },
                { id: 'Redondo', label: 'Redondo', icon: '⭕', desc: 'Largura e comprimento iguais' },
                { id: 'Quadrado', label: 'Quadrado', icon: '🔲', desc: 'Mandíbula bem angular' },
                { id: 'Retangular', label: 'Retangular', icon: '📱', desc: 'Comprido e reto' },
                { id: 'Triangular', label: 'Triangular', icon: '🔺', desc: 'Mandíbula mais larga' },
                { id: 'Coracao', label: 'Coração', icon: '🤍', desc: 'Testa larga e queixo fino' },
              ].map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => setFaceShape(opt.id)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                    faceShape === opt.id
                      ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-md'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800/80'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-2xl">{opt.icon}</span>
                    {faceShape === opt.id && <Check className="h-4 w-4 text-amber-400" />}
                  </div>
                  <div className="mt-2">
                    <p className="font-bold text-white">{opt.label}</p>
                    <p className="text-[10px] text-zinc-400">{opt.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Opção Não Sei */}
            <div
              onClick={() => setFaceShape('Nao sei')}
              className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between text-xs ${
                faceShape === 'Nao sei'
                  ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                  : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <HelpCircle className="h-4 w-4 text-amber-400" />
                <span className="font-semibold text-zinc-200">Não sei o formato do meu rosto</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFaceModalOpen(true);
                }}
                className="text-[11px] text-amber-400 underline"
              >
                Ver guia ilustrado
              </button>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep(3)}
                className="px-4 py-3.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={() => setStep(5)}
                className="flex-1 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
              >
                <span>Próximo: Cores & Tonalidades</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 5: CORES & TONALIDADES */}
        {/* ========================================================================= */}
        {step === 5 && (
          <div className="bg-[#14171F] border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="space-y-1 text-center">
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Passo 4 de 5</span>
              <h2 className="text-xl font-bold text-white">Tonalidade & Cor</h2>
              <p className="text-xs text-zinc-400">Quer experimentar uma cor nova ou manter a original?</p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              {[
                { id: 'Natural', label: 'Tom Natural', desc: 'Realce e hidratação' },
                { id: 'Castanho escuro', label: 'Castanho Escuro', desc: 'Sóbrio e marcante' },
                { id: 'Castanho claro', label: 'Castanho Claro', desc: 'Ilumina o semblante' },
                { id: 'Loiro', label: 'Loiro / Mechas', desc: 'Luzes ou descoloração' },
                { id: 'Platinado', label: 'Platinado / Nevou', desc: 'Branco / Prata moderno' },
                { id: 'Grisalho', label: 'Grisalho Matizado', desc: 'Camuflagem elegante' },
                { id: 'Colorido', label: 'Colorido / Fantasia', desc: 'Estilo alternativo' },
              ].map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => setColorPreference(opt.id)}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                    colorPreference === opt.id
                      ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-md'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800/80'
                  }`}
                >
                  <p className="font-bold text-white">{opt.label}</p>
                  <p className="text-[10px] text-zinc-400 mt-1">{opt.desc}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep(4)}
                className="px-4 py-3.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={handleEvaluate}
                disabled={evaluating}
                className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 disabled:opacity-50 text-black font-extrabold text-sm transition-all shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2"
              >
                {evaluating ? (
                  <span>Calculando Visagismo...</span>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Ver Meu Novo Visual</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 6: "MEU NOVO VISUAL" (RESULTADO FINAL) */}
        {/* ========================================================================= */}
        {step === 6 && recommendations.length > 0 && (
          <div className="space-y-6">
            {/* Header de Sucesso */}
            <div className="bg-gradient-to-tr from-amber-500/20 to-zinc-900 border border-amber-500/30 rounded-3xl p-6 text-center space-y-2 shadow-2xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold">
                <Star className="h-3.5 w-3.5 fill-amber-400" />
                <span>3 Recomendações Personalizadas</span>
              </div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                Seu Novo Visual ✂️
              </h2>
              <p className="text-xs text-zinc-300 max-w-sm mx-auto">
                Harmonia calculada para rosto <strong>{faceShape}</strong> e estilo <strong>{style}</strong>.
              </p>
            </div>

            {/* Recommendation Tabs (Top 1, 2, 3) */}
            <div className="grid grid-cols-3 gap-2">
              {recommendations.map((rec, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedRecIndex(idx)}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    selectedRecIndex === idx
                      ? 'bg-amber-500 text-black border-amber-400 font-bold shadow-lg shadow-amber-500/20'
                      : 'bg-[#14171F] border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                  }`}
                >
                  <p className="text-[10px] uppercase tracking-wider">{idx === 0 ? '🏆 Principal' : `Opção ${idx + 1}`}</p>
                  <p className="text-xs font-bold truncate mt-0.5">{rec.haircutName}</p>
                </button>
              ))}
            </div>

            {/* Selected Recommendation Card */}
            {(() => {
              const current = recommendations[selectedRecIndex];
              return (
                <div className="bg-[#14171F] border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
                  {/* Title & Score */}
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                        {current.haircutStyle}
                      </span>
                      <h3 className="text-xl sm:text-2xl font-black text-white mt-0.5">
                        {current.haircutName}
                      </h3>
                    </div>
                    <Badge variant="warning">{current.score}% Match</Badge>
                  </div>

                  {/* Detalhes de Barba e Cor */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-zinc-900/80 p-3.5 rounded-2xl border border-zinc-800">
                      <p className="text-[10px] text-zinc-500 uppercase font-semibold">Barba Sugerida</p>
                      <p className="text-xs font-bold text-white mt-0.5">{current.beardName || 'Rosto Liso / Alinhada'}</p>
                    </div>
                    <div className="bg-zinc-900/80 p-3.5 rounded-2xl border border-zinc-800">
                      <p className="text-[10px] text-zinc-500 uppercase font-semibold">Tonalidade</p>
                      <p className="text-xs font-bold text-white mt-0.5">{current.hairColor || colorPreference}</p>
                    </div>
                  </div>

                  {/* Justificativa do Visagismo */}
                  <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/80 space-y-1.5 text-xs">
                    <p className="font-bold text-amber-400 flex items-center gap-1.5">
                      <span>💡 Por que combina com você:</span>
                    </p>
                    <p className="text-zinc-300 leading-relaxed">{current.reasoning}</p>
                  </div>

                  {/* Dica do Barbeiro */}
                  <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/80 space-y-1 text-xs">
                    <p className="font-bold text-zinc-300">💈 Dica de finalização:</p>
                    <p className="text-zinc-400">{current.barberTips}</p>
                  </div>

                  {/* CTAs de Ação */}
                  <div className="space-y-3 pt-2">
                    <button
                      onClick={() => handleSelectAndAction('APPOINTMENT')}
                      className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-sm transition-all shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2"
                    >
                      <Calendar className="h-4 w-4" />
                      <span>Quero esse visual — Agendar Horário</span>
                    </button>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => handleSelectAndAction('WHATSAPP')}
                        className="py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/20"
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span>Enviar ao Barbeiro</span>
                      </button>

                      <button
                        onClick={() => handleSelectAndAction('SAVE')}
                        className="py-3.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Share2 className="h-4 w-4" />
                        <span>{savedFeedback ? 'Salvo!' : 'Salvar / Compartilhar'}</span>
                      </button>
                    </div>

                    <button
                      onClick={() => setStep(3)}
                      className="w-full py-2.5 text-center text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center justify-center gap-1"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Experimentar outras opções</span>
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Modal de Guia de Formatos de Rosto */}
        <Modal
          isOpen={isFaceModalOpen}
          onClose={() => setIsFaceModalOpen(false)}
          title="Guia de Formatos Faciais"
        >
          <div className="space-y-4 text-xs text-zinc-300 max-h-[70vh] overflow-y-auto pr-1">
            <p className="text-zinc-400 leading-relaxed">
              Observe seu rosto em frente ao espelho com o cabelo puxado para trás:
            </p>
            {guides?.faceShapes &&
              Object.entries(guides.faceShapes).map(([shape, info]: [string, any]) => (
                <div key={shape} className="bg-zinc-900 p-3.5 rounded-2xl border border-zinc-800 space-y-1">
                  <p className="font-bold text-white flex items-center gap-1.5">
                    <span>{info.icon}</span>
                    <span>{info.title}</span>
                  </p>
                  <p className="text-zinc-400 text-[11px]">{info.description}</p>
                  <p className="text-amber-400 text-[10px] font-semibold">{info.characteristics}</p>
                </div>
              ))}
          </div>
        </Modal>
      </div>
    </div>
  );
}
