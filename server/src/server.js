import { env } from './config/env.js';
import { connectDatabase } from './config/database.js';
import { createApp } from './app.js';
import { startAlertRetryJob } from './jobs/retryFailedAlerts.js';

await connectDatabase(env.mongodbUri);
startAlertRetryJob();

createApp().listen(env.port, () => {
  console.log(`Attendance API listening on port ${env.port}`);
});
