# FASE 21 — PROTOCOLO DE CONTROLE DE QUALIDADE E QA (VISAGISMO)

## 1. O Critério de Aceitação Absoluto
Durante a homologação, cada simulação deve atender à seguinte pergunta eliminatória:

> **"Se colocarmos a foto original e a foto final lado a lado, uma pessoa que conhece o cliente diria que é a mesma fotografia da mesma pessoa com apenas o corte de cabelo e/ou a barba modificados?"**

Se a resposta for **NÃO**, a imagem deve ser considerada reprovada.

## 2. Checklist de Verificação Manual e Automatizada
1. [x] **Olhos:** Formato, íris, esclera, pupilas e posição idênticos aos da foto original.
2. [x] **Nariz:** Ponte, largura e proporção idênticos à foto original.
3. [x] **Boca:** Lábios, dentes e expressão facial inalterados.
4. [x] **Pele Facial:** Textura, tom e manchas naturais do cliente mantidos fora da área de inpainting.
5. [x] **Fundo e Roupas:** Zero artefatos gerados por IA, mantendo o fundo real.
6. [x] **Transição da Linha do Cabelo (Feathering):** Sem linhas de recorte duras ou efeitos de "recorte de revista".
7. [x] **Estilo Aplicado:** O corte ou barba escolhido está claramente visível e harmônico com o formato do rosto.

## 3. Matriz de Cobertura de Cenários de Teste
O script [`scripts/qa-visual-visagism-phase21.ts`](file:///c:/Users/Thiago%20Thomaz/OneDrive/Documentos/AntiGravity%20-%20Projetos/Barbearia/scripts/qa-visual-visagism-phase21.ts) cobre:
* Transição de sem barba para barba cheia;
* Troca de formato de barba (cavanhaque vs. lenhador);
* Corte de cabelo curto para fade moderno;
* Redução de cabelo longo para buzz cut;
* Adição de cabelo em cliente careca;
* Cabelo e barba combinados simultaneamente;
* Selfies levemente inclinadas ou descentralizadas;
* Iluminação de baixa luz e alto contraste;
* Enquadramentos abertos (rosto pequeno na foto);
* Enquadramentos fechados (close-up frontal).
