import SDK = require('aws-sdk');

console.log(`aws-sdk = ${SDK}`);

export const AWS = (window as any).AWS;
