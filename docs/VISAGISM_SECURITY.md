# BarberFlow — Segurança, Privacidade e LGPD no Visagismo

## 1. Tratamento de Dados Pessoais e Imagens (LGPD)

### 1.1 Princípio da Minimização e Finalidade
- As fotos enviadas pelos clientes são utilizadas exclusivamente para renderização no navegador durante a sessão de visagismo.
- Não há compartilhamento de fotos com terceiros, APIs externas pagas ou modelos de IA de terceiros (OpenAI, Gemini, Stability, Anthropic).

### 1.2 Consentimento Explícito Obrigatório
- O cliente deve marcar o checkbox de consentimento antes do processamento da imagem.
- O timestamp do consentimento é gravado na tabela `VisagismSession.consentAt`.

### 1.3 Direito ao Esquecimento (Exclusão Imediata)
- O cliente possui botão dedicado de **"Excluir Foto"** diretamente na interface.
- A exclusão aciona o endpoint `DELETE /api/visagismo/session/[token]/photo`, que remove fisicamente o arquivo do disco e grava `photoDeletedAt`.

### 1.4 Retenção e Expiração Automática
- Todas as sessões possuem TTL de **24 horas** (`expiresAt`).
- Arquivos que ultrapassam o período são marcados como `EXPIRED` e limpos periodicamente.

---

## 2. Proteção de Acesso & Anti-IDOR

1. **Tokens Criptográficos Aleatórios**:
   - As sessões utilizam `crypto.randomBytes(24).toString('hex')` (mínimo 48 caracteres hexadecimais), tornando impossível a adivinhação por força bruta.
2. **Sem Exposição de IDs Internos**:
   - As URLs públicas expõem apenas `/visagismo/session/[token]`.
3. **Validação de Uploads**:
   - Limite máximo de arquivo: 5MB.
   - MIME types permitidos: `image/jpeg`, `image/png`, `image/webp`.
   - Nomes de arquivos sanitizados com hashes aleatórios para impedir Path Traversal.
