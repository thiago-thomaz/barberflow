# 📱 BARBERFLOW — FASE 18: GUIA TÉCNICO VISAGISMO NO WHATSAPP
## Integração de Conversação, Selfies e Recomendações Estéticas

---

## 1. Fluxo do Atendimento no WhatsApp

1. **Menu Principal**:
   ```text
   💈 BarberFlow

   1️⃣ Agendar horário
   2️⃣ Ver meu próximo horário
   3️⃣ Cancelar agendamento
   4️⃣ Remarcar horário
   5️⃣ Falar com a barbearia
   6️⃣ ✨ Visagismo — Mude de Visual
   0️⃣ Encerrar atendimento
   ```

2. **Ao Selecionar Opção 6**:
   - Cria/recupera a sessão de Visagismo do cliente vinculada ao `barbershopId` e `phone`.
   - Transita para o estado `VISAGISM_WAITING_IMAGE`.
   - Mensagem de orientação:
     ```text
     ✨ Vamos mudar seu visual!

     Vou analisar sua foto e sugerir cortes, estilos de cabelo e barba que combinam com você.

     📸 Envie uma selfie de frente, com boa iluminação e sem filtros.

     Não precisa ser uma foto profissional.
     ```

3. **Ao Enviar a Imagem**:
   - Se for imagem válida:
     - O sistema processa o arquivo via `GoogleGeminiVisagismProvider` (`gemini-3.6-flash`).
     - Detecta o formato do rosto (*Oval, Quadrado, Redondo, Retangular, Triangular, Coração*).
     - Seleciona as 3 melhores recomendações do catálogo existente (`src/lib/visagism/catalog.ts`).
     - Salva as recomendações na sessão.
     - Responde com o resumo estético e o link seguro para abrir no celular:
       ```text
       ✨ Encontrei estilos incríveis para o seu formato de rosto (Oval)!

       Preparei 3 opções personalizadas:
       🥇 Low Fade (Moderno)
       🥈 Mid Fade (Elegante)
       🥉 Taper Fade (Clássico)

       👉 Toque no link abaixo para ver a simulação no seu rosto e escolher:
       https://barber.projetosunion.cloud/visagismo/session/[token]

       Depois é só reservar seu horário! 💈
       ```
   - Se o cliente enviar texto em vez de foto enquanto espera:
     - Se enviar `0` ou `MENU` -> Retorna ao menu principal.
     - Caso contrário -> Lembra gentilmente que está aguardando a selfie de frente ou disponibiliza o link direto caso prefira fazer o upload pelo navegador.

4. **Na Página Web (`/visagismo/session/[token]`)**:
   - O cliente vê sua foto original ao lado da foto gerada pela IA com o corte aplicado.
   - Pode alternar entre as 3 opções de corte.
   - Pode abrir o modal Lightbox em tela cheia com alta resolução.
   - Pode tocar em **"💈 Quero esse visual"** para agendar seu horário, preservando a recomendação escolhida para o barbeiro ver.
