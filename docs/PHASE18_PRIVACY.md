# 🛡️ BARBERFLOW — FASE 18: POLÍTICA DE PRIVACIDADE E DADOS (LGPD)
## Visagismo e Análise Facial por Inteligência Artificial

---

## 1. Minimização e Coleta Estritamente Necessária
- **Finalidade Exclusiva**: A foto/selfie do cliente é coletada exclusivamente para a experiência estética de simulação de corte e estilo no BarberFlow ("Mude de Visual").
- **Não Compartilhamento Comercial**: As fotos nunca são vendidas, compartilhadas com terceiros para fins de marketing ou usadas para treinamento de modelos de IA de terceiros sem consentimento.
- **Provedores Homologados**: As chamadas de visão computacional utilizam APIs empresariais com isolamento de dados (Google Gemini API e Replicate API), sem retenção de dados para treinamento.

---

## 2. Política de Retenção e Descarte Automático
- **Tempo de Retenção Padrão (TTL)**: `VISAGISM_IMAGE_RETENTION_HOURS = 24` (24 horas a partir da criação da sessão).
- **Limpeza Automática (Auto-Purge)**: Sessões expiradas têm seus arquivos de imagem no disco removidos automaticamente pela rotina de expiração.
- **Direito ao Esquecimento (LGPD)**: O cliente tem à disposição na interface web o botão *"Excluir minha foto agora"*, que aciona a exclusão imediata e permanente do arquivo em disco e desassocia a foto da sessão (`photoDeletedAt = new Date()`).

---

## 3. Segurança e Sigilo em Logs
- **Proibição de Logs de Mídia**: É terminantemente proibido registrar imagens em Base64, buffers binários ou URLs de armazenamento privadas nos logs de sistema (`console.log`, logs do container ou banco de dados).
- **Ofuscação de Credenciais**: Tokens de sessão (`publicToken`), chaves de API (`GEMINI_API_KEY`, `REPLICATE_API_TOKEN`, `WAHA_API_KEY`) e senhas nunca são impressos nos registros de execução.
- **Isolamento Multi-Tenant**: Toda requisição e acesso a fotos valida o `barbershopId` associado. Um cliente ou barbearia jamais tem permissão de visualizar ou carregar fotos pertencentes a outro estabelecimento.

---

## 4. Termo de Consentimento Simples e Claro
Antes do processamento da imagem, o cliente é informado:
> *"Para gerar sua simulação, processamos sua foto temporariamente utilizando inteligência artificial. Sua imagem é privada, não é compartilhada e será excluída automaticamente após 24 horas."*
