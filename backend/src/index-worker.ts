import { bootstrapWorker } from '@vendure/core';
import { config } from './vendure-config';
// Initialize environment configuration early
import './infrastructure/config/environment.config';

bootstrapWorker(config)
    .then(worker => worker.startJobQueue())
    .catch(err => {
        // Use console.error for bootstrap failures (logger not yet initialized)
        console.error('❌ Failed to start worker:', err);
        process.exit(1);
    });
