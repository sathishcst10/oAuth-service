// Debug file to test ESM loading
console.log('Starting debug file...');

import express from 'express';
import dotenv from 'dotenv';

dotenv.config();
console.log('Environment loaded');

try {
  const app = express();
  console.log('Express initialized successfully');
  
  app.get('/test', (req, res) => {
    res.send('Test endpoint works!');
  });
  
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Debug server running on port ${PORT}`);
  });
} catch (error) {
  console.error('Error in debug file:', error);
}