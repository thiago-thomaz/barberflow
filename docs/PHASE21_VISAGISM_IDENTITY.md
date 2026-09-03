# FASE 21 — VISAGISMO: PRESERVAÇÃO REAL DE IDENTIDADE

## 1. O Contrato Visual Absoluto
O módulo de Visagismo do BarberFlow opera sob o princípio de que a foto original enviada pelo usuário é a **Fonte Única da Verdade (`SOURCE_OF_TRUTH = TRUE`)**.

### O que NUNCA é alterado (100% Protegido):
* Identidade e traços biométricos do cliente;
* Olhos, íris, esclera, pupilas e formato ocular;
* Sobrancelhas e arco supraciliar;
* Ponte nasal, dorso e ponta do nariz;
* Lábios, boca, dentes e expressão facial;
* Formato do crânio, queixo (salvo quando solicitada barba) e maçãs do rosto;
* Tom e textura de pele fora da área estrita de inpainting;
* Iluminação ambiente, enquadramento e proporção corporal;
* Roupas, pescoço e fundo original.

### O que PODE ser alterado (Somente mediante escolha do usuário):
* Cabelo (volume, textura, fade, franja e comprimento);
* Barba e bigode (quando selecionado `BEARD_ONLY` ou `HAIR_AND_BEARD`);
* Costeletas e linha do pezinho.

---

## 2. A Solução Matemática de Composição
A inteligência artificial gerativa (Replicate SDXL Inpainting / FLUX Fill) é utilizada **exclusivamente** para sintetizar os pixels dentro da máscara permitida.

A imagem final entregue ao cliente **NUNCA** é a imagem retornada diretamente pela IA. O backend executa a composição direta em memória:

$$\text{Final}[x, y] = \text{Original}[x, y] \times (1 - \alpha[x, y]) + \text{Gerado}[x, y] \times \alpha[x, y]$$

* Onde $\alpha[x, y] = 0$ (toda a região do rosto protegido, olhos, nariz, boca, roupas e fundo), a imagem final é **bit a bit idêntica à foto original**.
* Onde $\alpha[x, y] \in (0, 1)$ (borda com feathering suave na linha da testa), há uma fusão natural que impede linhas artificiais de corte.
* Onde $\alpha[x, y] = 1$ (cabelo novo), a textura do corte selecionado é aplicada com realismo fotográfico.

---

## 3. Os Três Quality Gates
1. **Pixel Preservation Gate:** Verifica se a taxa de alteração de pixels fora da máscara é $< 1.0\%$. Na nossa implementação composta, ela é comprovadamente $0.00\%$.
2. **Face Protected Region Gate (SSIM):** Calcula a similaridade estrutural no núcleo inegociável do rosto (olhos, nariz e boca). O limiar mínimo é $0.95$ ($95\%$). Na composição real, a fidelidade é de $100.0\%$.
3. **Texture & Sanity Gate:** Garante que a imagem final possui resolução válida, não está corrompida e tem contraste/textura natural de cabelo profissional.

Se qualquer um dos 3 gates falhar, a imagem é **imediatamente rejeitada**, nenhuma foto incorreta é exibida ao cliente e **nenhum crédito de simulação é debitado**.
