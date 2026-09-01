# FASE 19 — PRIVACIDADE, LGPD & MULTI-TENANCY

## 1. Proteção de Dados e Armazenamento Privado
- **Armazenamento Seguro**: As fotos dos clientes são armazenadas no diretório privado `storage/visagismo/` fora da raiz pública da aplicação (`/public`).
- **Nomes Não Previsíveis**: Cada arquivo é gravado com chave aleatória: `visagism_{sessionId}_{randomHex8}.jpg`.
- **Logs Limpos**: Nenhum buffer ou payload em Base64 é registrado em logs de console ou auditoria.

## 2. Direito ao Esquecimento (LGPD)
- O cliente possui o botão de lixeira no cabeçalho da página de visagismo para excluir imediatamente sua foto e dados da sessão (`DELETE /api/visagismo/session/[token]/photo`).
- O arquivo físico é desalocado do disco e marcado como deletado no banco de dados.

## 3. Isolamento Multi-Tenancy (Proteção IDOR)
- Todas as sessões, fotos, métricas e recomendações são vinculadas estritamente ao `barbershopId`.
- Uma barbearia A nunca consegue acessar, consultar ou modificar as sessões de uma barbearia B.
