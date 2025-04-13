const bcrypt = require('bcryptjs');

async function hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
}

async function comparePassword(plain, hash){
    return bcrypt.compare(plain, hash);
}

module.exports = {
    hashPassword,
    comparePassword,
}