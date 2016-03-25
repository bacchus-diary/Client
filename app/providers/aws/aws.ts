import SDK = require('aws-sdk');

console.log(`aws-sdk = ${SDK}`);

export * from 'aws-sdk';
export const AWS = (window as any).AWS;
