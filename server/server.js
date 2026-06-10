import { createApp } from './src/app.js';
import { env } from './src/config/env.js';

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`Сервер запущен: http://localhost:${env.PORT}`);
});
