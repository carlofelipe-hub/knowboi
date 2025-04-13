const sqlite3 = require('sqlite3').verbose();
const { hashPassword } = require('./auth');
const db = new sqlite3.Database('./database.sqlite');

(async () => {

    const hashed = await hashPassword('olraC0922');
  
    db.run(

        "INSERT INTO users (username, password, is_admin) VALUES (?, ?, ?)",
        ["carlofelipe101", hashed, 1],
        err => {
          if (err) console.error("❌ User creation failed:", err.message);
          else console.log("✅ carlofelipe101 user created!");
          db.close();

        }

      );

})();