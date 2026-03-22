const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const uploadDir = path.join(__dirname, '../../uploads');
const excelDir = path.join(uploadDir, 'excel');
const imagesDir = path.join(uploadDir, 'images');
const documentsDir = path.join(uploadDir, 'documents');

[uploadDir, excelDir, imagesDir, documentsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created upload directory: ${dir}`);
  }
});

// Main upload middleware
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let destDir = uploadDir;
    
    if (file.mimetype.includes('spreadsheet') || file.mimetype.includes('excel') || 
        path.extname(file.originalname).toLowerCase() === '.xlsx' ||
        path.extname(file.originalname).toLowerCase() === '.xls' ||
        path.extname(file.originalname).toLowerCase() === '.csv') {
      destDir = excelDir;
    } else if (file.mimetype.includes('image')) {
      destDir = imagesDir;
    } else {
      destDir = documentsDir;
    }
    
    cb(null, destDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf'
  ];
  
  const allowedExts = ['.xlsx', '.xls', '.csv', '.jpg', '.jpeg', '.png', '.gif', '.pdf'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed. Allowed: ${allowedExts.join(', ')}`), false);
  }
};

// Create the main upload instance
const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: fileFilter
});

// Create Excel-specific upload instance
const uploadExcel = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, excelDir),
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, `excel-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.xlsx', '.xls', '.csv'];
    const ext = path.extname(file.originalname).toLowerCase();
    allowed.includes(ext) ? cb(null, true) : cb(new Error('Only Excel files allowed'), false);
  }
});

// Create image-specific upload instance
const uploadImage = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, imagesDir),
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, `img-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    allowed.includes(ext) ? cb(null, true) : cb(new Error('Only image files allowed'), false);
  }
});

// Export the multer instances directly
module.exports = upload;
module.exports.uploadExcel = uploadExcel;
module.exports.uploadImage = uploadImage;
module.exports.excelDir = excelDir;
module.exports.imagesDir = imagesDir;
module.exports.documentsDir = documentsDir;