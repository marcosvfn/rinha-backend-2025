import { Router } from 'express';
import { PaymentController } from '../controllers/payment-controller';

export const createPaymentRoutes = (paymentController: PaymentController): Router => {
  const router = Router();

  router.post('/payments', (req, res) => paymentController.createPayment(req, res));
  router.get('/payments-summary', (req, res) => paymentController.getPaymentSummary(req, res));

  return router;
};