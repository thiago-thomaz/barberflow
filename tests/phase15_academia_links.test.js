const test = require('node:test');
const assert = require('node:assert/strict');
const { ACADEMIA_CONTENTS, ACADEMIA_CATEGORIES, ALLOWED_OFFICIAL_DOMAINS, validateExternalUrl } = require('../src/lib/academia/content.ts');

test('BarberFlow FASE 15 — Auditoria, Correção e Validação dos Links da Academia', async (t) => {
  // 1. URLs não vazias
  await t.test('1. Todas as URLs devem ser strings não vazias', () => {
    assert.ok(ACADEMIA_CONTENTS.length >= 80, 'Deve conter 80 ou mais conteúdos cadastrados');
    for (const item of ACADEMIA_CONTENTS) {
      assert.strictEqual(typeof item.officialUrl, 'string', `Item ${item.id} deve ter officialUrl string`);
      assert.ok(item.officialUrl.trim().length > 10, `Item ${item.id} deve ter URL válida`);
    }
  });

  // 2. Protocolo HTTPS
  await t.test('2. Todas as URLs devem utilizar protocolo seguro HTTPS', () => {
    for (const item of ACADEMIA_CONTENTS) {
      assert.ok(item.officialUrl.startsWith('https://'), `Item ${item.id} (${item.officialUrl}) deve iniciar com https://`);
    }
  });

  // 3. Domínios permitidos (Allowlist)
  await t.test('3. Todas as URLs devem pertencer à allowlist de domínios oficiais', () => {
    for (const item of ACADEMIA_CONTENTS) {
      const check = validateExternalUrl(item.officialUrl);
      assert.strictEqual(check.isValid, true, `Item ${item.id} falhou no validador: ${check.reason}`);
      assert.ok(check.domain, `Item ${item.id} deve retornar domínio identificado`);
    }
  });

  // 4. Título presente e formatado
  await t.test('4. Todos os conteúdos devem possuir título válido e não vazio', () => {
    for (const item of ACADEMIA_CONTENTS) {
      assert.strictEqual(typeof item.title, 'string');
      assert.ok(item.title.trim().length > 5, `Item ${item.id} deve ter título descritivo`);
    }
  });

  // 5. Instituição presente e reconhecida
  await t.test('5. Todos os conteúdos devem possuir instituição reconhecida', () => {
    for (const item of ACADEMIA_CONTENTS) {
      assert.ok(item.institution, `Item ${item.id} deve ter instituição`);
      assert.ok(item.institution.trim().length > 2, `Item ${item.id} instituição inválida`);
    }
  });

  // 6. Status de validação e data
  await t.test('6. Todos os conteúdos devem possuir lastVerifiedAt e status VALID', () => {
    for (const item of ACADEMIA_CONTENTS) {
      assert.strictEqual(item.lastVerifiedAt, '2026-08-31', `Item ${item.id} deve ter data de verificação 2026-08-31`);
      assert.strictEqual(item.verificationStatus, 'VALID', `Item ${item.id} deve ter status VALID`);
    }
  });

  // 7. Ausência de IDs duplicados
  await t.test('7. Não deve existir IDs duplicados no catálogo', () => {
    const seenIds = new Set();
    for (const item of ACADEMIA_CONTENTS) {
      assert.strictEqual(seenIds.has(item.id), false, `ID duplicado detectado: ${item.id}`);
      seenIds.add(item.id);
    }
    assert.strictEqual(seenIds.size, ACADEMIA_CONTENTS.length);
  });

  // 8. Gratuidade de 100% dos conteúdos
  await t.test('8. Todos os conteúdos devem ser 100% gratuitos', () => {
    for (const item of ACADEMIA_CONTENTS) {
      assert.strictEqual(item.isFree, true, `Item ${item.id} deve ser gratuito`);
    }
  });

  // 9. Nenhuma URL genérica não específica
  await t.test('9. Nenhuma URL de curso oficial deve ser catálogo genérico /cursosonline', () => {
    for (const item of ACADEMIA_CONTENTS) {
      if (item.format === 'CURSO') {
        assert.strictEqual(item.officialUrl.endsWith('/cursosonline'), false, `Item ${item.id} não pode apontar para /cursosonline genérico`);
        assert.strictEqual(item.officialUrl.endsWith('/cursos-online'), false, `Item ${item.id} não pode apontar para /cursos-online genérico`);
      }
      if (item.format === 'VIDEO') {
        assert.strictEqual(item.officialUrl.includes('dQw4w9WgXcQ'), false, `Vídeo ${item.id} não pode conter template de teste`);
        assert.ok(item.officialUrl.startsWith('https://www.youtube.com/watch?v='), `Vídeo ${item.id} deve ser link específico do YouTube`);
      }
    }
  });

  // 10. Validador de URL externa de segurança
  await t.test('10. Função validateExternalUrl deve rejeitar domínios suspeitos ou inválidos', () => {
    assert.strictEqual(validateExternalUrl('https://loja.sebrae.com.br/gest-o-financeira-1-372000026927').isValid, true);
    assert.strictEqual(validateExternalUrl('https://www.ev.org.br/cursos/atendimento-ao-publico').isValid, true);
    assert.strictEqual(validateExternalUrl('https://www.escolavirtual.gov.br/curso/11').isValid, true);
    assert.strictEqual(validateExternalUrl('https://www.gov.br/empresas-e-negocios').isValid, true);
    assert.strictEqual(validateExternalUrl('https://www.youtube.com/watch?v=ofuPr0mkmNA').isValid, true);

    // Domínios inválidos ou inseguros
    assert.strictEqual(validateExternalUrl('http://site-agregador-pirata.com/curso').isValid, false);
    assert.strictEqual(validateExternalUrl('https://phishing-barber.xyz/login').isValid, false);
    assert.strictEqual(validateExternalUrl('').isValid, false);
    assert.strictEqual(validateExternalUrl('not-a-url').isValid, false);
  });
});
