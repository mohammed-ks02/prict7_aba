require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

// Configuration SSL pour Supabase pooler
const sslConfig = {
  rejectUnauthorized: false,
  servername: new URL(process.env.DATABASE_URL).hostname // Extrait automatiquement l'hôte
};

// Pool principal
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslConfig
});

// Pool pour LISTEN
const notifyPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslConfig
});

async function getDashboardData() {
  const client = await pool.connect();
  try {
    const query = `
      SELECT DISTINCT ON (cin) 
        id, nom, cin, email, telephone, adresse, age, 
        antecedents, symptomes, allergies, traitements_en_cours, 
        created_at, groupe_sanguin
      FROM patients
      ORDER BY cin, created_at DESC
    `;
    const result = await client.query(query);
    return result.rows;
  } finally {
    client.release();
  }
}

async function broadcastDashboard() {
  try {
    const data = await getDashboardData();
    io.emit('dashboard-update', data);
    console.log(`📡 Diffusé (${data.length})`);
  } catch (err) {
    console.error('❌ broadcast:', err.message);
  }
}

notifyPool.connect((err, client) => {
  if (err) {
    console.error('❌ LISTEN impossible:', err.message);
    return;
  }
  client.query('LISTEN patients_change');
  client.on('notification', async () => {
    console.log('🔔 Changement détecté');
    await broadcastDashboard();
  });
  console.log('👂 En écoute sur patients_change');
});

app.get('/api/dashboard', async (req, res) => {
  try {
    const data = await getDashboardData();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur' });
  }
});

io.on('connection', (socket) => {
  console.log('🟢 Client connecté');
  getDashboardData()
    .then(data => socket.emit('dashboard-update', data))
    .catch(err => console.error(err));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 sur http://localhost:${PORT}`);
});