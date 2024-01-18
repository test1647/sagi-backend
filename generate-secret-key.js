const crypto = require('crypto');

const generateRandomSecretKey = () => {
  const secretKey = crypto.randomBytes(32).toString('hex');
  console.log('Random Secret Key:', secretKey);
};

generateRandomSecretKey();
