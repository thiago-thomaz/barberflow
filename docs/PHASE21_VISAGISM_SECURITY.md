# FASE 21 — SEGURANÇA, PRIVACIDADE E CONFORMIDADE LGPD (VISAGISMO)

## 1. Tratamento de Dados Biométricos e Imagens Sensíveis
* **Armazenamento Privado e Não Indexável:** Todas as fotos originais e simulações geradas são gravadas no diretório privado do servidor (`/storage/visagismo/` e `/storage/visagismo/previews/`). Esse diretório é isolado da pasta `/public` do Next.js e bloqueado contra indexação de motores de busca.
* **Tokens de Sessão Criptograficamente Seguros:** As rotas de exibição de foto e simulação exigem um `publicToken` gerado com `crypto.randomBytes(24).toString('hex')` (48 caracteres hexadecimais), imune a ataques de força bruta.
* **Sanitização de Path Traversal:** O identificador da simulação (`previewId`) é rigorosamente sanitizado através de `path.basename()`, impedindo qualquer tentativa de injeção de diretório relativo (`../`).
* **Direito ao Esquecimento (LGPD Art. 18):** O endpoint `DELETE /api/visagismo/session/[token]/photo` realiza a exclusão atômica física do arquivo do disco e atualiza a sessão com `photoDeletedAt: new Date()`.
* **Retenção Temporária:** Sessões e imagens temporárias possuem TTL de 24 horas, sendo marcadas como `EXPIRED` e limpas periodicamente.

## 2. Não Exposição de Credenciais e Isolamento de Logs
* Tokens de API da Replicate (`REPLICATE_API_TOKEN`) e Gemini (`GEMINI_API_KEY`) nunca são expostos no frontend nem incluídos em respostas HTTP.
* Logs estruturados registram apenas metadados técnicos anônimos (`latencyMs`, `outside_diff`, `face_ssim`, `maskMode`, `haircutName`). **Nenhuma foto em base64, buffer de imagem ou coordenada biométrica sensível é impressa nos logs de console**.

## 3. Proteção Contra Abuso e Controle de Custos
* **Limite por Sessão:** Máximo de 3 simulações aprovadas por sessão (`VISAGISM_MAX_GENERATIONS_PER_SESSION`).
* **Limite de Tentativas Técnicas:** Máximo de 8 tentativas totais por sessão para mitigar scripts maliciosos de sobrecarga de API.
* **Proteção contra Falhas de IA:** Gerações rejeitadas pelo Quality Gate não são contabilizadas no limite de simulações do cliente.
