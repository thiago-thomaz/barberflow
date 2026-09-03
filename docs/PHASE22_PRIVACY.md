# FASE 22 — POLÍTICA DE PRIVACIDADE E SEGURANÇA BIOMÉTRICA (LGPD & IDENTITY PRESERVATION)

## 1. Princípios de Proteção de Dados e Biometria

O módulo de Visagismo do BarberFlow foi construído em estrita conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018):

1. **Consentimento Explícito (Opt-in):** Nenhuma fotografia é capturada, processada ou armazenada sem a prévia autorização do titular no Step 1 do fluxo.
2. **Finalidade Estrita:** As imagens são utilizadas exclusivamente para gerar a simulação visual de corte/barba solicitada e recomendar serviços pertinentes da barbearia.
3. **Isolamento de Storage:**
   - As fotos dos clientes residem em diretório privado protegido no servidor (`/app/storage/visagismo/`).
   - Nomes de arquivos são ofuscados com hashes criptográficos não sequenciais (`visagism_{sessionId}_{randomHex8}.jpg`).
   - Não há listagem de diretório ou acesso público irrestrito. O acesso ocorre exclusivamente via token seguro de sessão.
4. **Descarte e Retenção:** As imagens e simulações vinculadas a sessões temporárias podem ser purgadas periodicamente após o ciclo de atendimento ou mediante requisição do titular.
5. **Composição Local em Servidor Próprio:** A junção matemática do rosto original com o corte gerado é processada localmente na instância do BarberFlow via biblioteca `sharp` (libvips), sem envio de dados a terceiros não autorizados.
