const multer = require('multer');
const path = require('path');
const fs = require('fs');

function createUpload() {
  // __dirname = <projectRoot>/backend/src/config
  const projectRoot = path.resolve(__dirname, '..', '..', '..');
  const uploadsDir = path.join(projectRoot, 'Public', 'uploads');

  // Ensure uploads directory exists
  fs.mkdirSync(uploadsDir, { recursive: true });

  const storage = multer.diskStorage({
    destination: function (_req, _file, cb) {
      cb(null, uploadsDir);
    },
    filename: function (_req, file, cb) {
      const safe = String(file.originalname || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
      cb(null, `${Date.now()}_${Math.random().toString(16).slice(2)}_${safe}`);
    }
  });

  return multer({
    storage,
    limits: { files: 10, fileSize: 8 * 1024 * 1024 },
  });
}

module.exports = { createUpload };

