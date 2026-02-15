const express = require('express');
const cors = require('cors');
const path = require('path');

const { createApiRoutes } = require('./routes/apiRoutes');

function createApp({ controllers }) {
  const app = express();

  // Resolve absolute paths (avoid depending on process.cwd())
  // __dirname = <projectRoot>/backend/src
  const projectRoot = path.resolve(__dirname, '..', '..');
  const publicDir = path.join(projectRoot, 'Public');
  const frontendDir = path.join(projectRoot, 'frontend');

  // Middlewares
  app.use(cors());
  app.use(express.json());

  // Session (MVP): read user identity from headers set by frontend session
  const { sessionFromHeaders } = require('./middleware/sessionFromHeaders');
  app.use(sessionFromHeaders);

  // Static (uploads + public assets)
  app.use(express.static(publicDir));
  app.use('/uploads', express.static(path.join(publicDir, 'uploads')));

  // Serve frontend pages
  // Serve /app/* pages, but don't auto-serve index.html for /app/ (we handle /app/ explicitly below)
  app.use('/app', express.static(path.join(frontendDir, 'pages'), { index: false }));
  app.use('/app/css', express.static(path.join(frontendDir, 'css')));
  app.use('/app/js', express.static(path.join(frontendDir, 'js')));
  app.use('/app/assets', express.static(path.join(frontendDir, 'assets')));

  // Root -> admin panel (so http://localhost:3000/ works)
  app.get(['/', '/app', '/app/'], (_req, res) => {
    res.sendFile(path.join(frontendDir, 'pages', 'admin.html'));
  });

  // API
  app.use('/api', createApiRoutes(controllers));

  return app;
}

module.exports = { createApp };

