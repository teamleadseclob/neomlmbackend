import app from './app';
import connectDB from './config/db';
import env from './config/env';
import logger from './config/logger';

const startServer = async (): Promise<void> => {
  try {
    await connectDB();

    const server = app.listen(env.port, () => {
      logger.info(`NEO MLM Server running in ${env.nodeEnv} mode on port ${env.port}`);
    });

    const gracefulShutdown = (signal: string): void => {
      logger.info(`${signal} received. Shutting down gracefully...`);
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });

      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    process.on('unhandledRejection', (err) => {
      logger.error({ err }, 'Unhandled Rejection');
      gracefulShutdown('UNHANDLED_REJECTION');
    });

    process.on('uncaughtException', (err) => {
      logger.error({ err }, 'Uncaught Exception');
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to start server');
    process.exit(1);
  }
};

startServer();
