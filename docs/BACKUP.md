# Estratégia de Backup e Disaster Recovery — BarberFlow

Este documento descreve a estratégia oficial de cópias de segurança, retenção, criptografia e procedimentos de restauração do banco de dados do **BarberFlow**.

---

## 1. Frequência e Retenção de Backups

| Tipo de Backup | Frequência | Retenção | Armazenamento |
|---|---|---|---|
| **Snapshot Horário (WAL)** | A cada 1 hora | 48 horas | Volume local + S3 |
| **Dump Diário Completo** | Todo dia às 03:00 UTC | 30 dias | S3 / MinIO (Offsite) |
| **Dump Semanal Consolidado** | Todo Domingo às 04:00 UTC | 12 meses | Armazenamento Frio (Glacier) |

---

## 2. Execução Automatizada de Backup

O script em `scripts/backup.js` suporta tanto PostgreSQL em produção quanto SQLite em desenvolvimento.

### 2.1. Execução Manual:
```bash
node scripts/backup.js
```

### 2.2. Agendamento via Cron no Servidor Linux:
```cron
# Backup diário do banco às 03:00
0 3 * * * cd /app/barberflow && node scripts/backup.js >> /var/log/barberflow_backup.log 2>&1
```

---

## 3. Procedimento de Restauração e Teste de Recuperação

Nunca considere um backup válido sem testar sua restauração.

### 3.1. Teste Automatizado de Restauração:
```bash
node scripts/test-restore.js
```
O script cria um banco temporário isolado, valida a contagem de registros em tabelas vitais (`Barbershop`, `User`, `Customer`, `Appointment`) e descarta o ambiente de teste.

### 3.2. Restauração Manual em PostgreSQL:
```bash
gunzip < backups/backup-postgres-YYYY-MM-DD.sql.gz | psql -U barberflow -d barberflow_db
```
