# BarberFlow — Configuração e Operação do Visagismo

## 1. Como Ativar o Visagismo para a Barbearia

O Visagismo vem ativado nativamente para todos os tenants ativos no BarberFlow.

### 1.1 No WhatsApp
- Quando o cliente envia uma mensagem e recebe o menu de boas-vindas, a opção `6️⃣ *✂️ Mudar meu visual (Visagismo)*` é exibida.
- Se o cliente digitar frases como *"Quero mudar meu visual"*, *"Qual corte combina comigo?"* ou *"Visagismo"*, o sistema gera automaticamente o link único e seguro para o cliente.

### 1.2 No Link Público
- A URL pública `https://barber.projetosunion.cloud/visagismo/session/[token]` pode ser aberta em qualquer navegador mobile (iOS Safari, Android Chrome, etc.).

---

## 2. Variáveis de Ambiente
Nenhuma chave de API externa é necessária (Zero API Token Cost).
As imagens são armazenadas com segurança no diretório local `storage/visagismo/`.
