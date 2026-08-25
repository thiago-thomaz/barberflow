# Conformidade com a LGPD (Lei Geral de Proteção de Dados) — BarberFlow

O BarberFlow foi desenvolvido com princípios de **Privacy by Design** e **Privacy by Default**, atendendo aos requisitos da Lei Geral de Proteção de Dados (Lei nº 13.709/2018).

---

## 1. Bases Legais Utilizadas

1. **Execução de Contrato / Prestação de Serviço (Art. 7º, V)**:
   - Coleta de nome e telefone/WhatsApp estritamente para viabilizar o agendamento e prestação do serviço na barbearia.
2. **Consentimento para Comunicações de Marketing (Art. 7º, I)**:
   - Campo `marketingOptIn` no modelo `Customer` com timestamp de consentimento `privacyConsentAt`.
   - Clientes que desativarem o opt-in não recebem campanhas de reativação ou ofertas.

---

## 2. Direitos dos Titulares de Dados

### 2.1. Direito de Acesso e Exportação (Art. 18, II)
- O BarberFlow disponibiliza função para exportação estruturada em JSON contendo todos os dados cadastrais e histórico de atendimentos e pagamentos do cliente (`exportCustomerLGPD`).

### 2.2. Direito de Anonimização e Eliminação (Art. 18, IV e VI)
- A função `anonymizeCustomerLGPD` substitui nomes por identificadores genéricos (`Cliente Anonimizado #XXXX`), zera telefones e remove e-mails e anotações pessoais.
- O histórico financeiro e de faturamento agregado da barbearia é preservado sem reter dados identificáveis de pessoas físicas.

---

## 3. Segurança e Registro de Acesso
- Todas as ações administrativas sobre dados pessoais geram registros na tabela `AuditLog` com identificação do operador, data/hora e tipo de ação executada.
