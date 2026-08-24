import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const client = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

client.on('error', (err) => console.error('Redis Client Error:', err));
client.on('connect', () => console.log('Redis connected successfully.'));
client.on('reconnecting', () => console.log('Redis reconnecting...'));

client.connect().catch(err => console.error('Redis init connection failed:', err.message));

export default client;
