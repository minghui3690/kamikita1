import 'dotenv/config'; // MUST be first to avoid hoisting issues   
import express from 'express'; // Trigger Restart 
import cors from 'cors';
import morgan from 'morgan';

console.log('Starting server initialization... (Restart Triggered)');

// import prisma from './lib/prisma';
import prisma from './lib/prisma';
console.log('Dotenv config done (via import).');

import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import productRoutes from './routes/productRoutes';
import transactionRoutes from './routes/transactionRoutes';
import voucherRoutes from './routes/voucherRoutes';
import settingsRoutes from './routes/settingsRoutes';
import customerRoutes from './routes/customerRoutes';
import hdRoutes from './routes/hdRoutes';
import consultationRoutes from './routes/consultationRoutes';
import testimonialRoutes from './routes/testimonialRoutes';

console.log('Routes imported.');

const app = express();
// const prisma = new PrismaClient();
const PORT = 5001; // Force 5001 to avoid .env conflict

// Test Database Connection
prisma.$connect()
  .then(() => {
    console.log('✅ Connected to Database successfully!');
  })
  .catch((e) => {
    console.error('❌ Database connection failed:', e);
  });

app.use(cors());
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));
app.use(morgan('dev'));

import path from 'path';

console.log('Middleware set.');

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/vouchers', voucherRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/hd-knowledge', hdRoutes); // [NEW] Knowledge Base Routes
app.use('/api/consultation', consultationRoutes); // [NEW] Consultation System
app.use('/api/testimonials', testimonialRoutes); // [NEW] Product Testimonials

app.get('/', (req, res) => {
  res.json({ message: 'RichDragon API is running' });
});

import chatRoutes from './routes/chatRoutes';
app.use('/api/chat', chatRoutes); // [NEW] AI Chat


console.log('Routes defined, starting listen...');

const server = app.listen(PORT, '0.0.0.0', () => { // Bind to all interfaces
  console.log(`Server running on port ${PORT}`);
});

server.on('close', () => console.log('Server closed'));
server.on('error', (e) => console.error('Server error:', e));


