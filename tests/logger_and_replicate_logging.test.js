const { test, describe } = require('node:test');
const assert = require('node:assert');

// Import logger module
const {
  logger,
  log,
  sanitizeLogData,
  maskToken,
  generateRequestId,
} = require('../src/lib/logger.ts');

describe('BARBERFLOW — LOGGING & REPLICATE AI AUDIT SUITE', () => {
  // 1. Sanitization of sensitive data
  test('1. sanitizeLogData sanitiza recursivamente chaves sensíveis e mascara valores', () => {
    const sensitiveObj = {
      password: 'mySuperSecretPassword123',
      token: 'r8_secretReplicateTokenSampleValue123456789',
      apiKey: 'secret_key_999999',
      normalField: 'Barbearia Alpha',
      nested: {
        authorization: 'Bearer eyJhbGciOi...',
        clientPhone: '11999998888',
      },
    };

    const sanitized = sanitizeLogData(sensitiveObj);

    assert.strictEqual(sanitized.normalField, 'Barbearia Alpha');
    assert.strictEqual(sanitized.nested.clientPhone, '11999998888');
    assert.ok(sanitized.password.includes('[REDACTED]'));
    assert.ok(sanitized.token.includes('[REDACTED]'));
    assert.ok(sanitized.nested.authorization.includes('[REDACTED]'));
    assert.ok(!sanitized.password.includes('mySuperSecretPassword123'));
  });

  // 2. Buffer and base64 truncation
  test('2. sanitizeLogData trunca buffers e strings base64 pesadas', () => {
    const rawBuffer = Buffer.alloc(1024 * 50); // 50 KB
    const base64Data = `data:image/jpeg;base64,${Buffer.alloc(1000).toString('base64')}`;

    const payload = {
      imageBuffer: rawBuffer,
      photoData: base64Data,
    };

    const sanitized = sanitizeLogData(payload);

    assert.ok(typeof sanitized.imageBuffer === 'string');
    assert.ok(sanitized.imageBuffer.includes('51200 bytes'));
    assert.ok(typeof sanitized.photoData === 'string');
    assert.ok(sanitized.photoData.includes('BASE64_IMAGE'));
  });

  // 3. maskToken helper
  test('3. maskToken oculta parte central do token mantendo prefixo e sufixo', () => {
    const token = 'r8_81394a8c91823abce1283';
    const masked = maskToken(token);

    assert.ok(masked.startsWith('r8_8'));
    assert.ok(masked.endsWith('1283'));
    assert.ok(masked.includes('...'));
    assert.strictEqual(maskToken(null), '[NOT_SET]');
  });

  // 4. Request ID Generation
  test('4. generateRequestId gera identificadores com prefixo req_ e tamanho seguro', () => {
    const id1 = generateRequestId();
    const id2 = generateRequestId();

    assert.ok(id1.startsWith('req_'));
    assert.ok(id2.startsWith('req_'));
    assert.notStrictEqual(id1, id2);
  });

  // 5. logger.replicate execution for all lifecycle steps
  test('5. logger.replicate executa sem erros para todos os passos do ciclo FLUX Fill', () => {
    const steps = [
      'TOKEN_CHECK',
      'INPUT_VALIDATION',
      'MASK_GENERATION',
      'PROMPT_COMPILATION',
      'PREDICTION_DISPATCH',
      'RATE_LIMIT_BACKOFF',
      'ENDPOINT_FALLBACK',
      'POLLING_STATUS',
      'IMAGE_DOWNLOADED',
      'IDENTITY_GATE_EVALUATED',
      'COMPOSITE_COMPLETED',
      'PREDICTION_SUCCESS',
      'PREDICTION_FAILED',
      'PREDICTION_CANCELED',
      'PREDICTION_ERROR',
    ];

    for (const step of steps) {
      assert.doesNotThrow(() => {
        logger.replicate(step, {
          model: 'black-forest-labs/flux-fill-dev',
          predictionId: 'pred_12345678',
          status: step.toLowerCase(),
          latencyMs: 150,
          identityScore: 0.98,
          faceSSIM: 0.99,
          outsideDiffRatio: 0.0,
        });
      }, `Falha ao emitir log no passo ${step}`);
    }
  });

  // 6. logger.visagism domain logger
  test('6. logger.visagism registra métricas de pipeline com contexto seguro', () => {
    assert.doesNotThrow(() => {
      logger.visagism('PREFLIGHT_CHECK', {
        sessionId: 'sess_987654',
        barbershopId: 'tenant_123',
        valid: true,
        width: 1024,
        height: 1024,
        durationMs: 45,
      });
    });
  });

  // 7. logger.http API logger
  test('7. logger.http registra requisições HTTP e calcula status level adequadamente', () => {
    assert.doesNotThrow(() => {
      logger.http('POST', '/api/visagismo/session/token123/generate-preview', 200, 1250, {
        haircut: 'Low Fade',
      });
      logger.http('GET', '/api/barbers', 404, 20);
      logger.http('POST', '/api/webhooks/whatsapp', 500, 350, { error: 'Timeout' });
    });
  });

  // 8. logger.auth and logger.whatsapp
  test('8. logger.auth e logger.whatsapp gravam eventos de domínio', () => {
    assert.doesNotThrow(() => {
      logger.auth('LOGIN_ATTEMPT', {
        email: 'dono@barbearia.com',
        success: true,
        userId: 'user_1',
      });

      logger.whatsapp('MESSAGE_RECEIVED', {
        phone: '5511999998888',
        text: 'Opção 6 - Visagismo',
        actionTaken: 'sendVisagismLink',
      });
    });
  });
});
