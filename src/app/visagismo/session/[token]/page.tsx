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
  Calendar,
  MessageSquare,
  Trash2,
  HelpCircle,
  ShieldCheck,
  RotateCcw,
  Star,
  Check,
  Maximize2,
  ZoomIn,
  X,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react';
import { Modal } from '@/components/UI/Modal';
import { Badge } from '@/components/UI/Badge';
import { BeforeAfterSlider } from '@/components/Visagismo/BeforeAfterSlider';

export default function VisagismoSessionPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [session, setSession] = useState<any | null>(null);
  const [guides, setGuides] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [step, setStep] = useState<number>(1);

  // Step 2: Photo, Confirmation & Consent
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isPhotoConfirmed, setIsPhotoConfirmed] = useState<boolean>(false);
  const [consent, setConsent] = useState<boolean>(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Profile questionnaire
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

  // AI Generated Visual Previews (Inpainting Facial)
  const [aiPreviews, setAiPreviews] = useState<Record<number, string>>({});
  const [generatingPreview, setGeneratingPreview] = useState<boolean>(false);
  const [remainingGenerations, setRemainingGenerations] = useState<number>(3);

  // Lightbox Zoom Modal (Expansão em Tela Cheia)
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string; subtitle?: string } | null>(null);

  // Action states
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Função para disparar Inpainting com preservação de identidade na foto do cliente
  const triggerAiPreview = async (recIndex: number, currentRecs?: any[]) => {
    const list = currentRecs || recommendations;
    const targetRec = list[recIndex];
    if (!targetRec || !photoPreview) return;
    if (aiPreviews[recIndex]) return; // Já gerado em cache

    if (remainingGenerations <= 0) {
      alert('Você já utilizou o limite de 3 simulações para esta sessão.');
      return;
    }

    setGeneratingPreview(true);
    try {
      let base64Payload: string | undefined = undefined;
      if (photoPreview.startsWith('data:')) {
        base64Payload = photoPreview;
      } else {
        try {
          const photoBlobRes = await fetch(photoPreview);
          if (photoBlobRes.ok) {
            const blob = await photoBlobRes.blob();
            base64Payload = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
          }
        } catch (e) {
          // fallback
        }
      }

      const res = await fetch(`/api/visagismo/session/${token}/generate-preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetImageUrl: targetRec.referenceImageUrl,
          haircutName: targetRec.haircutName,
          haircutId: targetRec.haircutId,
          beardName: targetRec.beardName,
          beardId: targetRec.beardId,
          hairColor: targetRec.hairColor,
          objective,
          clientPhotoBase64: base64Payload,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.previewUrl) {
        setAiPreviews((prev) => ({ ...prev, [recIndex]: data.previewUrl }));
        if (typeof data.remainingGenerations === 'number') {
          setRemainingGenerations(data.remainingGenerations);
        }
      } else {
        alert(data.message || data.error || 'Não foi possível gerar a simulação no momento.');
      }
    } catch (err: any) {
      console.warn('Erro ao gerar inpainting facial:', err);
      alert('Erro de conexão ao gerar simulação. Tente novamente.');
    } finally {
      setGeneratingPreview(false);
    }
  };

  // Carrega dados da Sessão
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
            setIsPhotoConfirmed(true);
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
            setStep(6); // Direto para os resultados se já avaliado
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

  // Função auxiliar para comprimir e normalizar a foto no celular antes do upload
  const compressAndNormalizeImage = async (
    file: File,
    maxWidth = 1024,
    maxHeight = 1024,
    quality = 0.85
  ): Promise<{ blob: Blob; dataUrl: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Falha ao ler arquivo de foto'));
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = () => reject(new Error('Falha ao decodificar imagem'));
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Falha ao processar canvas'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve({ blob, dataUrl });
              } else {
                reject(new Error('Falha ao comprimir imagem'));
              }
            },
            'image/jpeg',
            quality
          );
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  // Manipulação de Seleção de Foto (Câmera ou Galeria com Compressão Automática)
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { blob, dataUrl } = await compressAndNormalizeImage(file, 1024, 1024, 0.85);
      const normalizedFile = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });
      setPhotoFile(normalizedFile);
      setPhotoPreview(dataUrl);
      setIsPhotoConfirmed(false);
    } catch (err: any) {
      console.warn('Fallback para imagem original:', err.message);
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotoPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
      setIsPhotoConfirmed(false);
    }
  };

  // Upload definitivo da foto após confirmação do usuário
  const handleConfirmAndUploadPhoto = async () => {
    if (!consent) {
      alert('Por favor, confirme o consentimento para prosseguir.');
      return;
    }

    if (!photoFile && !photoPreview) {
      setStep(3);
      return;
    }

    setUploadingPhoto(true);
    try {
      let res: Response;

      // Tentativa 1: FormData com o arquivo comprimido
      if (photoFile) {
        const formData = new FormData();
        formData.append('photo', photoFile);
        formData.append('consent', 'true');

        res = await fetch(`/api/visagismo/session/${token}/photo`, {
          method: 'POST',
          body: formData,
        });
      } else {
        // Tentativa 2: JSON com payload Base64
        res = await fetch(`/api/visagismo/session/${token}/photo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base64: photoPreview,
            consent: true,
          }),
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro no upload da foto');

      setIsPhotoConfirmed(true);
      if (data.detectedFaceShape) {
        setFaceShape(data.detectedFaceShape);
        setAiDetectedShape(data.detectedFaceShape);
      }
      if (data.notes) {
        setAiNotes(data.notes);
      }

      setStep(3);
    } catch (err: any) {
      console.error('Erro no upload da foto:', err);
      // Fallback gracioso: permite continuar preenchendo o questionário mesmo se o upload falhar temporariamente
      setIsPhotoConfirmed(true);
      setStep(3);
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Exclusão de foto (LGPD)
  const handleDeletePhoto = async () => {
    if (!confirm('Deseja realmente excluir sua foto? Ela será apagada permanentemente do servidor.')) return;
    try {
      await fetch(`/api/visagismo/session/${token}/photo`, { method: 'DELETE' });
      setPhotoPreview(null);
      setPhotoFile(null);
      setIsPhotoConfirmed(false);
      setAiPreviews({});
      alert('Foto excluída com sucesso.');
    } catch (err) {
      alert('Erro ao excluir foto.');
    }
  };

  // Submissão do perfil & Cálculo das Recomendações
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
      setStep(6); // Step 6: Resultados & Simulação
    } catch (err: any) {
      alert(err.message);
    } finally {
      setEvaluating(false);
    }
  };

  // Ação de Seleção de Estilo & Redirecionamento
  const handleSelectAndAction = async (actionType: 'APPOINTMENT' | 'WHATSAPP') => {
    const selectedRec = recommendations[selectedRecIndex];
    if (!selectedRec) return;

    setActionLoading(actionType);
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
          action: actionType === 'APPOINTMENT' ? 'APPOINTMENT_CLICKED' : 'WHATSAPP_SHARED',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao selecionar estilo');

      if (actionType === 'WHATSAPP' && data.whatsappUrl) {
        window.open(data.whatsappUrl, '_blank');
      } else if (actionType === 'APPOINTMENT' && data.bookingUrl) {
        router.push(data.bookingUrl);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0D13] text-white flex flex-col items-center justify-center p-6">
        <Loader2 className="h-10 w-10 text-amber-500 animate-spin mb-4" />
        <p className="text-zinc-400 font-medium">Carregando experiência de Visagismo...</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-[#0B0D13] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4 text-red-400">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h1 className="text-xl font-bold mb-2">Link Expirado ou Inválido</h1>
        <p className="text-zinc-400 max-w-sm mb-6 text-sm">
          {error || 'Esta sessão de visagismo expirou por motivos de segurança.'}
        </p>
        <button
          onClick={() => router.push('/')}
          className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-all"
        >
          Voltar ao Início
        </button>
      </div>
    );
  }

  const shop = session.barbershop;

  return (
    <div className="min-h-screen bg-[#0B0D13] text-zinc-100 flex flex-col items-center">
      {/* Top Header */}
      <header className="w-full max-w-lg border-b border-zinc-800/80 bg-[#0B0D13]/80 backdrop-blur-md sticky top-0 z-30 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
            <Scissors className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white leading-none">Mude de Visual</h1>
            <p className="text-[11px] text-zinc-400 mt-0.5">{shop?.name || 'BarberFlow'}</p>
          </div>
        </div>

        {photoPreview && (
          <button
            onClick={handleDeletePhoto}
            title="Excluir minha foto (LGPD)"
            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-red-400 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </header>

      {/* Main Container */}
      <main className="w-full max-w-lg flex-1 p-4 pb-24 space-y-6">
        {/* STEP 1: INTRODUÇÃO & BOAS-VINDAS */}
        {step === 1 && (
          <div className="space-y-6 pt-4">
            <div className="text-center space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
                Experiência de Visagismo
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                Descubra o estilo que valoriza seus traços
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-xs mx-auto">
                Análise geométrica facial combinada com inteligência artificial para sugerir e simular o corte e a barba ideais.
              </p>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 mt-0.5">
                  <Camera className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">1. Tire uma selfie pelo celular</h3>
                  <p className="text-[11px] text-zinc-400">Rápido e no seu navegador, sem envio de mídia no WhatsApp.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 mt-0.5">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">2. Receba 3 recomendações</h3>
                  <p className="text-[11px] text-zinc-400">Harmonização para seu formato de rosto, barba e estilo.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 mt-0.5">
                  <Scissors className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">3. Simule no seu rosto e reserve</h3>
                  <p className="text-[11px] text-zinc-400">Veja como fica em você com o comparativo Antes / Depois.</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all text-sm"
            >
              <span>Começar Visagismo</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* STEP 2: CÂMERA / GALERIA & CONFIRMAÇÃO DA FOTO */}
        {step === 2 && (
          <div className="space-y-5 pt-2">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-bold text-white">Foto para Análise</h2>
              <p className="text-xs text-zinc-400">
                Sua foto será usada exclusivamente para identificar suas proporções e simular o corte.
              </p>
            </div>

            {/* Inputs Ocultos de Câmera Frontal e Galeria */}
            <input
              type="file"
              ref={cameraInputRef}
              accept="image/*"
              capture="user"
              onChange={handlePhotoSelect}
              className="hidden"
            />
            <input
              type="file"
              ref={galleryInputRef}
              accept="image/*"
              onChange={handlePhotoSelect}
              className="hidden"
            />

            {/* Preview da Foto ou Seletor de Upload */}
            {photoPreview ? (
              <div className="space-y-4">
                <div className="relative aspect-square max-w-[280px] mx-auto rounded-3xl overflow-hidden border-2 border-amber-500/50 shadow-2xl bg-zinc-950">
                  <img
                    src={photoPreview}
                    alt="Sua foto selecionada"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                  <span className="absolute bottom-3 left-3 text-[10px] font-bold text-white bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/10">
                    Sua Foto
                  </span>
                </div>

                {/* Bloco de Confirmação: Essa foto está boa? */}
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 text-center space-y-3">
                  <p className="text-xs font-bold text-white">Essa foto está boa?</p>
                  <p className="text-[11px] text-zinc-400">
                    Certifique-se de que seu rosto e cabelo estão bem visíveis, de frente e sem sombras fortes.
                  </p>

                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoPreview(null);
                        setPhotoFile(null);
                      }}
                      className="py-2.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-xl transition-all"
                    >
                      Escolher outra
                    </button>
                    <button
                      type="button"
                      disabled={uploadingPhoto}
                      onClick={handleConfirmAndUploadPhoto}
                      className="py-2.5 px-3 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
                    >
                      {uploadingPhoto ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Analisando...</span>
                        </>
                      ) : (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>Usar esta foto</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Botões de Ação Câmera vs Galeria */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="p-6 bg-zinc-900/90 hover:bg-zinc-800/90 border border-zinc-800 rounded-3xl flex flex-col items-center justify-center gap-3 text-center transition-all group cursor-pointer shadow-lg hover:border-amber-500/40"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                      <Camera className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Tirar Selfie</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Câmera frontal</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="p-6 bg-zinc-900/90 hover:bg-zinc-800/90 border border-zinc-800 rounded-3xl flex flex-col items-center justify-center gap-3 text-center transition-all group cursor-pointer shadow-lg hover:border-amber-500/40"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 group-hover:scale-110 transition-transform">
                      <ImageIcon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Galeria</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Escolher arquivo</p>
                    </div>
                  </button>
                </div>

                {/* Instruções para Boa Foto */}
                <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-3.5 space-y-2 text-xs">
                  <p className="font-bold text-amber-400 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4" />
                    <span>Dicas para máxima precisão:</span>
                  </p>
                  <ul className="text-[11px] text-zinc-400 space-y-1 list-disc list-inside">
                    <li>Foto frontal, olhando diretamente para a câmera</li>
                    <li>Boa iluminação no rosto (sem sombras fortes)</li>
                    <li>Sem óculos escuros, bonés ou filtros</li>
                    <li>Rosto e cabelo completamente visíveis</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Termo de Consentimento LGPD */}
            <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-3 flex items-start gap-2.5">
              <input
                type="checkbox"
                id="consent-checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-1 rounded bg-zinc-800 border-zinc-700 text-amber-500 focus:ring-0 focus:ring-offset-0"
              />
              <label htmlFor="consent-checkbox" className="text-[10px] text-zinc-400 leading-tight">
                <span className="font-semibold text-white">Privacidade & LGPD:</span> Concordo em utilizar minha foto exclusivamente para esta experiência de visagismo. Você pode excluí-la a qualquer momento.
              </label>
            </div>

            {!photoPreview && (
              <button
                type="button"
                onClick={() => setStep(3)}
                className="w-full py-2.5 text-xs text-zinc-500 hover:text-zinc-300 font-semibold text-center transition-colors"
              >
                Prefiro responder apenas o questionário sem foto →
              </button>
            )}
          </div>
        )}

        {/* STEP 3, 4, 5: QUESTIONÁRIO DE PREFERÊNCIAS */}
        {step >= 3 && step <= 5 && (
          <div className="space-y-6 pt-2">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Etapa {step - 1} de 4</span>
              <span className="text-amber-400 font-bold">{faceShape} detectado</span>
            </div>

            {step === 3 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-white">Qual é o seu objetivo principal?</h2>
                  <p className="text-xs text-zinc-400">O que você quer transformar no seu visual?</p>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {['Corte', 'Barba', 'Corte + Barba', 'Estilo completo'].map((obj) => (
                    <button
                      key={obj}
                      type="button"
                      onClick={() => setObjective(obj)}
                      className={`p-4 rounded-2xl border text-left transition-all ${
                        objective === obj
                          ? 'bg-amber-500 text-black border-amber-400 font-bold shadow-lg shadow-amber-500/20'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      <p className="text-xs">{obj}</p>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-all mt-4"
                >
                  <span>Continuar</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-white">Qual estilo mais combina com sua rotina?</h2>
                  <p className="text-xs text-zinc-400">Escolha o visual que você deseja transmitir.</p>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {['Moderno', 'Classico', 'Executivo', 'Despojado', 'Degrade', 'Natural'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStyle(st)}
                      className={`p-4 rounded-2xl border text-left transition-all ${
                        style === st
                          ? 'bg-amber-500 text-black border-amber-400 font-bold shadow-lg shadow-amber-500/20'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      <p className="text-xs">{st}</p>
                    </button>
                  ))}
                </div>
                <div className="flex gap-2.5 mt-4">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-2xl text-xs"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(5)}
                    className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <span>Continuar</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-white">Nível de Mudança e Manutenção</h2>
                  <p className="text-xs text-zinc-400">Com que frequência você costuma ir à barbearia?</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400">Impacto da Transformação</label>
                    <div className="grid grid-cols-3 gap-2 mt-1.5">
                      {['Pouco', 'Medio', 'Radical'].map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setChangeLevel(lvl)}
                          className={`py-2.5 px-2 rounded-xl border text-center text-xs font-semibold ${
                            changeLevel === lvl
                              ? 'bg-amber-500 text-black border-amber-400 font-bold'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                          }`}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400">Disponibilidade para Manutenção</label>
                    <div className="grid grid-cols-3 gap-2 mt-1.5">
                      {[
                        { id: 'Pouco', label: 'A cada 30d' },
                        { id: 'Medio', label: 'A cada 15-20d' },
                        { id: 'Bastante', label: 'Toda semana' },
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setMaintenanceLevel(m.id)}
                          className={`py-2.5 px-2 rounded-xl border text-center text-xs font-semibold ${
                            maintenanceLevel === m.id
                              ? 'bg-amber-500 text-black border-amber-400 font-bold'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={evaluating}
                  onClick={handleEvaluate}
                  className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all mt-6 disabled:opacity-50"
                >
                  {evaluating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Harmonizando Traços com IA...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>Ver Meus Cortes Recomendados</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 6: RECOMENDAÇÕES & SIMULAÇÃO ANTES/DEPOIS (IA) */}
        {step === 6 && recommendations.length > 0 && (
          <div className="space-y-6 pt-2">
            {/* Seletor do Top 3 Recomendações */}
            <div className="grid grid-cols-3 gap-2">
              {recommendations.slice(0, 3).map((rec, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedRecIndex(idx)}
                  className={`p-2.5 rounded-2xl border text-left transition-all ${
                    selectedRecIndex === idx
                      ? 'bg-amber-500 text-black border-amber-400 font-bold shadow-lg shadow-amber-500/20'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                  }`}
                >
                  <p className="text-[10px] uppercase font-bold tracking-wider">
                    {idx === 0 ? '🥇 Principal' : idx === 1 ? '🥈 Opção 2' : '🥉 Opção 3'}
                  </p>
                  <p className="text-xs font-extrabold truncate mt-0.5">{rec.haircutName}</p>
                </button>
              ))}
            </div>

            {/* Card da Recomendação Selecionada */}
            {(() => {
              const current = recommendations[selectedRecIndex];
              const aiPreviewImg = aiPreviews[selectedRecIndex];

              return (
                <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-5 sm:p-6 space-y-5 shadow-2xl">
                  {/* Cabeçalho do Estilo */}
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

                  {/* VISUAL SHOWCASE: SLIDER INTERATIVO ANTES/DEPOIS OU PREVIEW */}
                  {photoPreview && aiPreviewImg ? (
                    <BeforeAfterSlider
                      originalImage={photoPreview}
                      generatedImage={aiPreviewImg}
                      haircutName={current.haircutName}
                      faceShape={faceShape}
                      onExpand={() =>
                        setLightboxImage({
                          url: aiPreviewImg,
                          title: `${current.haircutName} — Você com o Novo Visual`,
                          subtitle: `Simulação de IA aplicada com preservação de identidade`,
                        })
                      }
                    />
                  ) : (
                    <div className="space-y-3">
                      {/* Foto do Cliente - Foco 100% no rosto real */}
                      {photoPreview && (
                        <div className="space-y-2">
                          <div className="relative aspect-[4/5] max-h-[360px] mx-auto rounded-3xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-2xl group">
                            <img
                              src={photoPreview}
                              alt="Sua foto original"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
                            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-amber-500/30 flex items-center gap-1.5 text-[11px] font-bold text-amber-400">
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Sua Foto Pronta para Simulação</span>
                            </div>
                            <div className="absolute bottom-3 left-3 right-3 text-left">
                              <p className="text-white font-extrabold text-sm">{current.haircutName}</p>
                              <p className="text-zinc-300 text-[11px]">Estilo recomendado para formato {faceShape}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Botão para Disparar Inpainting Facial */}
                      {photoPreview && !aiPreviewImg && (
                        <div className="pt-1">
                          <button
                            type="button"
                            disabled={generatingPreview || remainingGenerations <= 0}
                            onClick={() => triggerAiPreview(selectedRecIndex)}
                            className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black font-extrabold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
                          >
                            {generatingPreview ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Aplicando {current.haircutName} na sua foto...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-4 w-4" />
                                <span>✨ Simular este visual na minha foto</span>
                              </>
                            )}
                          </button>
                          <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-400 mt-2 text-center">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>Seu rosto original é 100% preservado. A simulação altera somente cabelo/barba.</span>
                          </div>
                          <p className="text-[10px] text-zinc-500 text-center mt-1.5">
                            Você possui <span className="text-amber-400 font-bold">{remainingGenerations}</span> simulações restantes nesta sessão.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Detalhes de Barba e Cuidados */}
                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div className="bg-zinc-950/60 p-3 rounded-2xl border border-zinc-800">
                      <p className="text-[10px] text-zinc-500 uppercase font-semibold">Barba Recomendada</p>
                      <p className="text-xs font-bold text-white mt-0.5">{current.beardName || 'Alinhada / Por Fazer'}</p>
                    </div>
                    <div className="bg-zinc-950/60 p-3 rounded-2xl border border-zinc-800">
                      <p className="text-[10px] text-zinc-500 uppercase font-semibold">Manutenção</p>
                      <p className="text-xs font-bold text-white mt-0.5">{current.maintenance}</p>
                    </div>
                  </div>

                  {/* Justificativa do Visagismo */}
                  <div className="bg-zinc-950/40 p-4 rounded-2xl border border-zinc-800/80 space-y-1.5 text-xs">
                    <p className="font-bold text-amber-400 flex items-center gap-1.5">
                      <span>💡 Por que recomendamos este estilo para você:</span>
                    </p>
                    <p className="text-zinc-300 leading-relaxed text-[11px]">{current.reasoning}</p>
                  </div>

                  {/* Ações Finais: Quero Esse Visual & Agendamento */}
                  <div className="space-y-2.5 pt-2">
                    <button
                      type="button"
                      disabled={actionLoading !== null}
                      onClick={() => handleSelectAndAction('APPOINTMENT')}
                      className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-2xl text-sm flex items-center justify-center gap-2 shadow-xl shadow-amber-500/25 transition-all"
                    >
                      {actionLoading === 'APPOINTMENT' ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <Calendar className="h-5 w-5" />
                          <span>✨ QUERO ESSE VISUAL — AGENDAR HORÁRIO</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={actionLoading !== null}
                      onClick={() => handleSelectAndAction('WHATSAPP')}
                      className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 border border-zinc-700 transition-all"
                    >
                      {actionLoading === 'WHATSAPP' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <MessageSquare className="h-4 w-4 text-emerald-400" />
                          <span>Compartilhar Escolha no WhatsApp</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </main>

      {/* LIGHTBOX ZOOM MODAL */}
      <Modal
        isOpen={lightboxImage !== null}
        onClose={() => setLightboxImage(null)}
        title={lightboxImage?.title || 'Visual em Alta Resolução'}
      >
        <div className="space-y-4">
          <div className="relative aspect-square sm:aspect-[4/3] rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800">
            {lightboxImage && (
              <img
                src={lightboxImage.url}
                alt={lightboxImage.title}
                className="w-full h-full object-contain"
              />
            )}
          </div>
          {lightboxImage?.subtitle && (
            <p className="text-xs text-zinc-400 text-center">{lightboxImage.subtitle}</p>
          )}
        </div>
      </Modal>
    </div>
  );
}
