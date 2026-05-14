console.log('>>> Starting index.js (v2: added forgot-password) <<<');
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { connectDB, sequelize } = require('./config/db');
require('./models'); // load all models & run associations

// Import Routes
const transactionRoutes = require('./routes/transactionRoutes');
const walletRoutes = require('./routes/walletRoutes');
const userRoutes = require('./routes/userRoutes');
const groupRoutes = require('./routes/groupRoutes');
const invitationRoutes = require('./routes/invitationRoutes');
const groupTransactionRoutes = require('./routes/groupTransactionRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Main Root
app.get('/', (req, res) => {
  res.send('Expense Tracker API is running...');
});

app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working' });
});

// Routes
app.use('/api/transactions', transactionRoutes);
app.use('/api/wallets', walletRoutes);
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/invites', invitationRoutes);
app.use('/api/group-transactions', groupTransactionRoutes);
app.use('/api/notifications', notificationRoutes);

const PORT = process.env.PORT || 5000;

// Sync Database and Start Server
const startServer = async () => {
  await connectDB();

  // Sync models
  try {

    await sequelize.sync({ alter: true }); // Automatically sync database changes
    console.log('✅ Database models synced.');
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to sync database:', error);
  }
};

startServer();
