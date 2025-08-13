# Rinha de Backend 2025 - Payment Processor

Backend intermediário que roteia pagamentos entre dois processadores (Default 5% taxa, Fallback 15% taxa) com estratégia de otimização baseada em health checks e circuit breakers.

## 🏗️ Arquitetura

- **Clean Architecture** com TypeScript
- **Load Balancer**: nginx com 2 instâncias da aplicação
- **Database**: PostgreSQL com Prisma ORM
- **Cache**: Redis para health checks
- **Containers**: Docker Compose
- **Performance**: p99 < 10ms (bônus até 20%)

## 🚀 Execução

### 1. Iniciar Payment Processors (obrigatório primeiro)
```bash
# Na raiz do projeto rinha-de-backend-2025
cd payment-processor
docker compose up -d
```

### 2. Iniciar Nossa Aplicação
```bash
cd solution
docker compose up -d
```

### 3. Verificar Status
```bash
# API disponível em http://localhost:9999
curl http://localhost:9999/health

# Payment processors
curl http://localhost:8001/payments/service-health  # Default
curl http://localhost:8002/payments/service-health  # Fallback
```

## 📊 Endpoints

### POST /payments
```bash
curl -X POST http://localhost:9999/payments \
  -H "Content-Type: application/json" \
  -d '{
    "correlationId": "123e4567-e89b-12d3-a456-426614174000",
    "amount": 100.50
  }'
```

### GET /payments-summary
```bash
curl "http://localhost:9999/payments-summary?from=2024-01-01T00:00:00.000Z&to=2024-12-31T23:59:59.999Z"
```

## 🎯 Estratégia de Otimização

1. **Preferência Default**: Sempre tenta processador Default primeiro (5% taxa)
2. **Rate Limiting**: Health check limitado a 1 req/5s por processador
3. **Circuit Breaker**: Se Default falha, usa Fallback (15% taxa)
4. **Cache**: Status de saúde cached no Redis para performance

## 📈 Recursos e Performance

- **CPU Total**: 1.5 unidades
- **Memória Total**: 350MB
- **Instâncias**: 2x aplicação + nginx + postgres + redis
- **Porta**: 9999 (conforme especificação)
- **Health Checks**: Implementados em todos os serviços

## 🛠️ Tecnologias

- **Linguagem**: TypeScript + Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL + Prisma ORM
- **Cache**: Redis
- **Load Balancer**: nginx
- **Containers**: Docker Compose

## 🔍 Monitoramento

- Logs estruturados (Winston)
- Performance metrics automáticos
- Health checks com timeout
- Rate limiting de API

## 🏃‍♂️ Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Configurar ambiente
cp .env.example .env

# Gerar Prisma client
npm run db:generate

# Build
npm run build

# Executar em dev
npm run dev
```