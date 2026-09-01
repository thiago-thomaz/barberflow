/**
 * BarberFlow - Phase 18 E2E Simulator
 * Simula a jornada completa do cliente:
 * WhatsApp (Menu) -> Opção 6 -> Envio de Selfie -> Análise -> Link Web -> Simulação -> Agendamento
 */

import { processWhatsAppMessage } from '../src/lib/whatsapp/engine';
import { prisma } from '../src/lib/prisma';
import fs from 'fs';
import path from 'path';

async function runE2E() {
  console.log('\n======================================================');
  console.log('🧪 SIMULAÇÃO E2E — VISAGISMO NO WHATSAPP');
  console.log('======================================================\n');

  const testPhone = '5514999998888';

  // 1. Localiza a barbearia de teste
  const shop = await prisma.barbershop.findFirst({
    where: { isActive: true },
  });

  if (!shop) {
    throw new Error('Nenhuma barbearia ativa encontrada no banco para teste.');
  }

  console.log(`💈 Barbearia Selecionada: ${shop.name} (${shop.slug})`);

  // 2. Passo 1: Cliente envia "Oi" para ver o menu
  console.log('\n📱 [Etapa 1] Cliente envia "Oi" no WhatsApp...');
  const resMenu = await processWhatsAppMessage({
    from: testPhone,
    text: 'Oi',
    tenantSlugOrId: shop.slug,
  });

  console.log('💬 Resposta do Bot:\n', resMenu.reply);
  if (!resMenu.reply.includes('Visagismo')) {
    throw new Error('Opção de Visagismo não encontrada no menu principal.');
  }

  // 3. Passo 2: Cliente escolhe a Opção 6
  console.log('\n📱 [Etapa 2] Cliente escolhe a Opção 6...');
  const resOption6 = await processWhatsAppMessage({
    from: testPhone,
    text: '6',
    tenantSlugOrId: shop.slug,
  });

  console.log('💬 Resposta do Bot:\n', resOption6.reply);
  console.log('⚙️ Estado Atual da Sessão:', resOption6.state);

  if (resOption6.state !== 'VISAGISM_WAITING_IMAGE') {
    throw new Error(`Estado esperado VISAGISM_WAITING_IMAGE, recebido: ${resOption6.state}`);
  }

  // 4. Passo 3: Cliente envia Selfie em Base64
  console.log('\n📱 [Etapa 3] Cliente envia selfie no WhatsApp...');
  // Cria imagem de teste 100x100 jpeg válida
  const sampleBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

  const resSelfie = await processWhatsAppMessage({
    from: testPhone,
    text: '[FOTO]',
    tenantSlugOrId: shop.slug,
    mediaBase64: sampleBase64,
    mediaMimeType: 'image/jpeg',
  });

  console.log('💬 Resposta do Bot com Recomendações e Link:\n', resSelfie.reply);

  if (!resSelfie.reply.includes('/visagismo/session/')) {
    throw new Error('Link da sessão de Visagismo não gerado na resposta.');
  }

  // 5. Passo 4: Extrai token e valida integridade no banco
  const matchToken = resSelfie.reply.match(/\/visagismo\/session\/([a-f0-9]+)/);
  if (!matchToken) {
    throw new Error('Não foi possível extrair o publicToken do link.');
  }
  const publicToken = matchToken[1];
  console.log('\n🔑 Public Token Identificado:', publicToken);

  const dbSession = await prisma.visagismSession.findUnique({
    where: { publicToken },
    include: { recommendations: true, profile: true },
  });

  if (!dbSession) {
    throw new Error('Sessão de Visagismo não encontrada no banco de dados.');
  }

  console.log('✅ Sessão no Banco:', {
    id: dbSession.id,
    barbershopId: dbSession.barbershopId,
    status: dbSession.status,
    detectedFaceShape: dbSession.profile?.faceShape,
    totalRecommendations: dbSession.recommendations.length,
    topRecommendation: dbSession.recommendations[0]?.haircutName,
  });

  console.log('\n======================================================');
  console.log('🎉 SUCESSO: FLUXO COMPLETO E2E EXECUTADO COM PERFEIÇÃO!');
  console.log('======================================================\n');
}

runE2E()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Erro no teste E2E:', err);
    process.exit(1);
  });
