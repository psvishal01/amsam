const FormData = require('form-data');
const fetch = require('node-fetch'); // If not available, we can just use native fetch in node 18+
const fs = require('fs');

async function testImport() {
  const fd = new FormData();
  fd.append('file', Buffer.from('test'), { filename: 'test.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  fd.append('sendEmail', 'true');

  const req = await fetch('http://localhost:3000/api/users/bulk-import', {
    method: 'POST',
    // We would need authorization token.
  });
}
// Actually, let's just make a small script to hit our own server or print the body
