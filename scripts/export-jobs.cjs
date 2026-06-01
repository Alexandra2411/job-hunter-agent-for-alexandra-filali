const Database = require('better-sqlite3');
const db = new Database('./jobs.db');
const jobs = db.prepare('SELECT * FROM jobs LIMIT 15').all();
console.log(JSON.stringify(jobs, null, 2));
