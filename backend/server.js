require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const { initializeDatabase } = require('./src/config/database');
const { seedDatabase } = require('./src/utils/seed');
const { errorHandler, notFound } = require('./src/middleware/error');

// Routes
const authRoutes = require('./src/routes/auth');
const doctorRoutes = require('./src/routes/doctors');
const patientRoutes = require('./src/routes/patients');
const appointmentRoutes = require('./src/routes/appointments');
const reviewRoutes = require('./src/routes/reviews');
const notificationRoutes = require('./src/routes/notifications');
const adminRoutes = require('./src/routes/admin');
const specialtyRoutes = require('./src/routes/specialties');
const facilityRoutes = require('./src/routes/facilities');
const queueRoutes = require('./src/routes/queue');
const prescriptionRoutes = require('./src/routes/prescriptions');
const referralRoutes = require('./src/routes/referrals');
const documentRoutes = require('./src/routes/documents');
const paymentRoutes = require('./src/routes/payments');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize DB
initializeDatabase();

// Seed data
seedDatabase().catch(console.error);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'MediBook API is running', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/specialties', specialtyRoutes);
app.use('/api/facilities', facilityRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/payments', paymentRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`\n🚀 MediBook API running on http://localhost:${PORT}`);
  console.log(`📖 Health check: http://localhost:${PORT}/api/health\n`);
});

module.exports = app;
