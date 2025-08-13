import 'dotenv/config';
import express, { Request, Response, NextFunction, Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { setupDependencies } from './infrastructure/config/app-config';
import { createPaymentRoutes } from './presentation/routes/payment-routes';
import { PaymentController } from './presentation/controllers/payment-controller';
import { LoggerService } from './shared/logging';

const PORT = process.env.PORT || 3000;

async function bootstrap() {
  const logger = new LoggerService('main');
  
  try {
    logger.info('Starting application bootstrap');
    
    const container = await setupDependencies();
    logger.logConfigurationLoad('dependency-injection', 6); // Número de dependências registradas
    
    const app: Application = express();

    app.use(helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false
    }) as any);
    app.use(compression() as any);
    app.use(cors() as any);
    app.use(express.json({ limit: '1mb' }));

    app.disable('x-powered-by');

    // Request logging middleware
    app.use((req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        logger.logHttpRequest(
          req.method,
          req.originalUrl,
          res.statusCode,
          duration,
          req.headers['user-agent'] as string
        );
      });
      
      next();
    });

    const paymentController = container.resolve<PaymentController>('PaymentController');
    const paymentRoutes = createPaymentRoutes(paymentController);
    
    app.use('/', paymentRoutes);

    app.get('/health', (req, res) => {
      logger.debug('Health check requested');
      res.status(200).json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        version: process.env.APP_VERSION || '1.0.0'
      });
    });

    app.use('*', (req, res) => {
      logger.warn('Route not found', {
        method: req.method,
        url: req.originalUrl,
        userAgent: req.headers['user-agent'],
        operation: 'route_not_found'
      });
      res.status(404).json({ error: 'Route not found' });
    });

    app.use((error: any, req: any, res: any, next: any) => {
      logger.error('Global error handler', error, {
        method: req.method,
        url: req.originalUrl,
        userAgent: req.headers['user-agent'],
        operation: 'global_error_handler'
      });
      res.status(500).json({ error: 'Internal server error' });
    });

    app.listen(PORT, () => {
      logger.logSystemStartup(
        parseInt(PORT.toString()),
        process.env.NODE_ENV || 'development'
      );
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.logSystemShutdown('SIGTERM received');
      process.exit(0);
    });
    
    process.on('SIGINT', () => {
      logger.logSystemShutdown('SIGINT received');
      process.exit(0);
    });

  } catch (error) {
    logger.error('Failed to start server', error as Error, {
      operation: 'bootstrap_error'
    });
    process.exit(1);
  }
}

bootstrap();