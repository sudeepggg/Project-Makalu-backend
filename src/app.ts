import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler } from './middleware/error.middleware';
import { loggingMiddleware } from './middleware/logging.middleware';
import { authRoutes } from './modules/auth/auth.routes';
import { customerRoutes } from './modules/customer/customer.routes';
import { inventoryRoutes } from './modules/inventory/inventory.routes';
import { orderRoutes } from './modules/order/order.routes';
import { paymentRoutes } from './modules/payment/payment.routes';
import { pricingRoutes } from './modules/pricing/pricing.routes';
import { productRoutes } from './modules/product/product.routes';
import { reportRoutes } from './modules/report/report.routes';

const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json({ limit: env.MAX_REQUEST_SIZE }));
app.use(express.urlencoded({ extended: true }));
app.use(loggingMiddleware);

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/pricing', pricingRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/reports', reportRoutes);

// health
app.get('/health', (_req, res) => res.json({ status: 'OK', timestamp: new Date().toISOString() }));

// not found
function notFoundHandler(req: express.Request, res: express.Response) {
  res.status(404).json({ success: false, message: 'Route not found' });
}
app.use(notFoundHandler);

// error handler
app.use(errorHandler);

const PORT = env.PORT;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

export default app;