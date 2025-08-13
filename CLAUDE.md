# Rinha de Backend 2025 - Payment Processor

## Projeto Overview
Sistema de pagamentos intermediário que roteia requisições entre dois processadores (Default 5% taxa, Fallback 15% taxa) com estratégia de otimização baseada em health checks e circuit breakers.

## Arquitetura
- **Clean Architecture** com TypeScript
- **Domain Layer**: Entidades, repositórios e casos de uso
- **Infrastructure Layer**: PostgreSQL, Redis, HTTP clients
- **Application Layer**: Controllers, routes e DTOs
- **Dependency Injection**: Container customizado

## Development Steps

### 1. Setup Base do Projeto
```bash
# Instalar dependências
npm install

# Configurar ambiente
cp .env.example .env

# Build do projeto
npm run build

# Executar em desenvolvimento
npm run dev
```

### 2. Configuração de Banco de Dados
```bash
# Executar migrations no PostgreSQL
psql -U postgres -d rinha -f src/infrastructure/database/migrations.sql
```

### 3. Estrutura de Arquivos (kebab-case) - Clean Architecture
```
src/
├── presentation/                              # Interface Adapters
│   ├── controllers/payment-controller.ts      # Controllers HTTP
│   ├── dto/payment-dto.ts                     # Contratos de API
│   └── routes/payment-routes.ts               # Rotas Express
├── application/                               # Use Cases
│   ├── use-cases/
│   │   ├── process-payment-use-case.ts        # Orquestração de pagamento
│   │   └── get-payment-summary-use-case.ts    # Consulta de dados
│   ├── services/processor-orchestration-service.ts # Orquestração de processadores
│   └── base/base-use-case.ts                  # Classe base para use cases
├── domain/                                    # Regras de Negócio
│   ├── entities/payment.ts                    # Entidades ricas
│   ├── value-objects/                         # Tipos seguros
│   │   ├── correlation-id.ts
│   │   ├── money.ts
│   │   └── processor-type.ts
│   ├── repositories/                          # Interfaces (portos)
│   │   ├── payment-repository.ts
│   │   └── health-repository.ts
│   ├── services/payment-processor-service.ts  # Interface para processadores
│   └── policies/processor-selection-policy.ts # Policies de domínio
├── infrastructure/                            # Implementações
│   ├── database/
│   │   ├── prisma-payment-repository.ts       # Implementação Prisma ORM
│   │   └── migrations.sql                     # SQL migrations
│   ├── cache/redis-health-repository.ts       # Implementação Redis
│   ├── http/payment-processor-service.ts      # Cliente HTTP
│   └── config/                                # Configurações
│       ├── prisma.ts                          # Configuração Prisma
│       ├── database.ts
│       ├── redis.ts
│       └── app-config.ts                      # DI Container
└── shared/                                    # Utilitários
    ├── constants/app-constants.ts             # Constantes
    ├── enums/payment-enums.ts                 # Enums
    ├── errors/app-error.ts                    # Hierarquia de erros
    ├── result/result.ts                       # Result pattern
    ├── logging/                               # Sistema de logging
    └── validators/payment-validator.ts        # Validações
```

### 4. Implementação Core

#### 4.1 Domain Layer
- **payment.ts**: Define entidades Payment, PaymentRequest, PaymentSummary
- **payment-repository.ts**: Interface para persistência de pagamentos
- **health-repository.ts**: Interface para cache de health checks
- **process-payment.ts**: Caso de uso principal com estratégia de roteamento
- **get-payment-summary.ts**: Caso de uso para relatórios

#### 4.2 Infrastructure Layer
- **postgresql-payment-repository.ts**: Persistência em PostgreSQL com índices otimizados
- **redis-health-repository.ts**: Cache de health status com rate limiting (5s)
- **payment-processor-service.ts**: Cliente HTTP com timeout 1s e retry logic

#### 4.3 Application Layer
- **payment-controller.ts**: Endpoints POST /payments e GET /payments-summary
- **payment-routes.ts**: Configuração de rotas Express

### 5. Estratégia de Roteamento

#### Lógica de Decisão:
1. **Health Check Rate Limiting**: Máximo 1 req/5s por processador (Redis)
2. **Prioridade Default**: Sempre tentar processador Default primeiro (5% taxa)
3. **Circuit Breaker**: Se Default falhar, usar Fallback (15% taxa)
4. **Cache de Health**: Usar status cached se rate limit ativo

#### Implementação:
```typescript
// Em process-payment.ts
private async selectBestProcessor(): Promise<ProcessorConfig> {
  const defaultProcessor = this.processorConfigs.get('default')!;
  
  const canCheckDefault = await this.healthRepository.canCheckHealth('default');
  
  if (canCheckDefault) {
    const health = await this.paymentProcessorService.checkHealth(defaultProcessor);
    if (!health.failing) {
      return defaultProcessor; // Usar Default (5%)
    }
  }
  
  return this.processorConfigs.get('fallback')!; // Usar Fallback (15%)
}
```

### 6. Configuração Docker

#### Variáveis de Ambiente:
```env
# Payment Processors
DEFAULT_PROCESSOR_URL=http://payment-processor-default:8080
FALLBACK_PROCESSOR_URL=http://payment-processor-fallback:8080

# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=rinha
DB_USER=postgres
DB_PASSWORD=postgres

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
```

### 7. Endpoints Implementados

#### POST /payments
```json
{
  "correlationId": "uuid",
  "amount": 19.90
}
```
**Validações**: UUID válido, amount > 0, correlationId único

#### GET /payments-summary?from=ISO&to=ISO
```json
{
  "default": {
    "totalRequests": 100,
    "totalAmount": 1000.00
  },
  "fallback": {
    "totalRequests": 50,
    "totalAmount": 500.00
  }
}
```

### 8. Performance Targets

#### Métricas:
- **p99 < 10ms**: Bônus de performance até 20%
- **Taxa de Sucesso**: Máximo pagamentos em Default (5% vs 15%)
- **Consistência**: 0% inconsistência (multa 35%)

#### Otimizações:
- Pool de conexões DB (min: 5, max: 20)
- Timeout HTTP baixo (1s)
- Cache Redis para health status
- Índices PostgreSQL otimizados

### 9. Testing & Validation

#### Comandos de Build:
```bash
npm run build    # TypeScript compilation
npm run lint     # ESLint validation
npm run test     # Jest tests (quando implementados)
```

#### Validação Local:
```bash
# Testar endpoint payments
curl -X POST http://localhost:3000/payments \
  -H "Content-Type: application/json" \
  -d '{"correlationId":"123e4567-e89b-12d3-a456-426614174000","amount":100.50}'

# Testar summary
curl http://localhost:3000/payments-summary
```

### 10. Deployment Checklist

#### Antes do Deploy:
- [ ] Migrations executadas
- [ ] Variáveis de ambiente configuradas
- [ ] Health check dos processadores funcionando
- [ ] Conexões Redis e PostgreSQL estabelecidas
- [ ] Validação de rate limiting (5s entre health checks)

#### Monitoramento:
- [ ] Logs de erros de conexão
- [ ] Métricas de latência por processador
- [ ] Taxa de sucesso Default vs Fallback
- [ ] Contagem de health checks por minuto

### 11. Troubleshooting

#### Problemas Comuns:
- **Health Check 429**: Rate limit Redis funcionando corretamente
- **Payment 500**: Verificar conectividade com processadores
- **DB Connection**: Verificar pool de conexões PostgreSQL
- **Cache Miss**: Redis pode estar reiniciando

#### Debug Commands:
```bash
# Verificar logs Redis
docker logs redis-container

# Verificar connections PostgreSQL
SELECT * FROM pg_stat_activity WHERE datname = 'rinha';

# Verificar health cache
redis-cli GET health:default
```

## Melhorias Implementadas

### ✅ Clean Architecture Corrigida
- **Presentation Layer**: Controllers, DTOs, Routes
- **Application Layer**: Use Cases puros de orquestração
- **Domain Layer**: Entidades, Value Objects, Policies
- **Infrastructure Layer**: Implementações técnicas

### ✅ Sistema de Logging Avançado (Winston)
- Logging estruturado com contexto
- Performance metrics automáticos
- Business events para auditoria
- Logs por ambiente (dev vs prod)

### ✅ Prisma ORM Implementado
- Type-safe database operations
- Schema definido com índices otimizados
- Migrations automáticas
- Query builder integrado

### ✅ BaseUseCase com Template Method
- Logging automático para todos use cases
- Error handling padronizado
- Performance metrics
- Request sanitization

### ✅ Value Objects e Domain Policies
- CorrelationId, Money, ProcessorType type-safe
- ProcessorSelectionPolicy com regras de negócio puras
- Validation centralizada

## Setup do Projeto

### 1. Instalar Dependências
```bash
npm install
```

### 2. Configurar Prisma
```bash
# Gerar cliente Prisma
npm run db:generate

# Aplicar schema ao banco
npm run db:push

# Ou usar migrations
npm run db:migrate
```

### 3. Configurar Environment
```bash
cp .env.example .env
# Editar .env com suas configurações
```

### 4. Build e Execução
```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## Próximos Passos
1. Implementar Docker Compose com nginx load balancer
2. Configurar limites de recursos (1.5 CPU, 350MB RAM)
3. Implementar testes automatizados (Jest + Prisma)
4. Configurar CI/CD pipeline
5. Adicionar OpenTelemetry para observabilidade