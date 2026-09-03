# FASE 22 — POLÍTICA DE PRIVACIDADE, SEGURANÇA E LGPD DO VISAGISMO

## 1. Princípios Fundamentais de Privacidade

1. **Minimização de Dados (LGPD Art. 6º, III):**
   * O upload da imagem é utilizado estritamente para a finalidade consentida pelo cliente: identificação do formato facial e geração da simulação de corte de cabelo/barba.
   * Nenhuma fotografia é utilizada para treinamento de modelos públicos ou compartilhada com terceiros para fins publicitários.

2. **Isolamento Multi-Tenant Estrito:**
   * Cada sessão de visagismo é indexada por `barbershopId` e associada a um `sessionId` com token criptográfico de 48 caracteres hexadecimais gerado via `crypto.randomBytes(24).toString('hex')`.
   * Fotos e simulações de uma barbearia jamais são acessíveis por outra barbearia ou por usuários não autorizados.

3. **Proteção de Rotas e Armazenamento Privado:**
   * Todas as fotografias originais enviadas pelo cliente residem em storage local privado protegido no servidor (`/storage/visagismo/` ou `/app/storage/visagismo/`).
   * As fotos originais **NÃO** ficam em diretórios estáticos públicos (`/public`).
   * O acesso a fotos e simulações só é liberado mediante verificação de token de sessão ativo e não expirado via endpoint seguro com headers `Cache-Control: private, no-store`.

4. **Ciclo de Vida e Retenção Temporária:**
   * As fotografias de clientes possuem retenção transitória vinculada ao ciclo de atendimento.
   * Rotinas de limpeza descartam sessões expiradas ou descartadas.
   * Imagens geradas temporariamente em provedores terceiros (Replicate) são transitórias e não persistem na conta do usuário além do tempo de inferência.

5. **Consentimento Explícito (LGPD Art. 7º, I):**
   * Antes do upload ou captura da fotografia, o cliente visualiza o termo de consentimento claro e específico na interface web.
   * O timestamp do aceite é gravado em `consentAt` na tabela `VisagismSession`.

6. **Preservação Biométrica e Anti-Hallucination:**
   * A tecnologia de inpainting com máscara restringe qualquer modificação à área autorizada (cabelo/barba).
   * O Identity Gate biométrico impede a substituição do rosto original por modelos de catálogo ou pessoas sintéticas, assegurando que o cliente sempre veja a si próprio na simulação.
