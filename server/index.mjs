import { createApp } from './app.mjs';
import { port } from './config.mjs';

const app = createApp();

app.listen(port, () => {
  console.log(`plex-request api listening on http://localhost:${port}`);
});
