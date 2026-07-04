require('dotenv').config();
const express = require('express');

const authRoutes = require('./routes/auth');
const aslapRoutes = require('./routes/aslap');
const mitraRoutes = require('./routes/mitra');
const giziRoutes = require('./routes/gizi');
const akuntanRoutes = require('./routes/akuntan');

const app = express();
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/aslap', aslapRoutes);
app.use('/api/mitra', mitraRoutes);
app.use('/api/gizi', giziRoutes);
app.use('/api/akuntan', akuntanRoutes);

// 500 catch-all — biar error gak pernah bocor stack trace ke client
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, error: 'Terjadi kesalahan di server' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server jalan di port ${PORT}`));

