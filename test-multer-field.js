const express = require('express');
const multer = require('multer');
const app = express();
const memUpload = multer({ storage: multer.memoryStorage() });

app.post('/test', memUpload.single('file'), (req, res) => {
  console.log('Body:', req.body);
  console.log('File:', !!req.file);
  res.send('ok');
});

const server = app.listen(3001, async () => {
  const FormData = require('form-data');
  const fetch = require('node-fetch');
  
  const fd = new FormData();
  fd.append('file', Buffer.from('test'), { filename: 'test.xlsx' });
  fd.append('sendEmail', 'true');
  
  await fetch('http://localhost:3001/test', {
    method: 'POST',
    body: fd
  });
  
  server.close();
});
