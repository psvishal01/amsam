const db = require('./server/db');

async function check() {
  const users = await db.all('SELECT * FROM amsam_users ORDER BY id DESC LIMIT 5');
  console.log(users);
}
check();
