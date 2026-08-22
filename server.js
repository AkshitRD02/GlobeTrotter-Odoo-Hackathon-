const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5001;
const DB_FILE = path.join(__dirname, 'database.json');

app.use(cors());
app.use(express.json({ limit: '10mb' })); // Support base64 profile pictures

// Default database seeding
const DEFAULT_USERS = [
  { id: 'u1', name: 'Jane Doe', email: 'jane.doe@example.com', password: 'password123', role: 'User', status: 'Active', tripsCount: 3, joined: '2026-05-15', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80', language: 'en', currency: 'USD', savedDestinations: ['paris', 'london'] },
  { id: 'u2', name: 'Alex Smith', email: 'alex.smith@example.com', password: 'password123', role: 'User', status: 'Active', tripsCount: 1, joined: '2026-06-20', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80', language: 'en', currency: 'USD', savedDestinations: [] },
  { id: 'u3', name: 'Sarah Connor', email: 'sarah.c@example.com', password: 'password123', role: 'Moderator', status: 'Active', tripsCount: 5, joined: '2026-02-10', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80', language: 'en', currency: 'USD', savedDestinations: [] },
  { id: 'u4', name: 'Michael Scott', email: 'worldsbestboss@example.com', password: 'password123', role: 'User', status: 'Blocked', tripsCount: 0, joined: '2026-07-01', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80', language: 'en', currency: 'USD', savedDestinations: [] },
  { id: 'u5', name: 'Admin', email: 'admin@globetrotter.com', password: 'admin', role: 'Admin', status: 'Active', tripsCount: 0, joined: '2026-08-01', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80', language: 'en', currency: 'USD', savedDestinations: [] }
];

// Helper to read database
function readDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const initialData = { users: DEFAULT_USERS, trips: [] };
      fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
      return initialData;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading DB:', err);
    return { users: DEFAULT_USERS, trips: [] };
  }
}

// Helper to write database
function writeDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error writing DB:', err);
  }
}

// ==================== AUTHENTICATION API ====================

// Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const db = readDb();
  const emailLower = email.trim().toLowerCase();
  const user = db.users.find(u => 
    u.email.toLowerCase() === emailLower || 
    (emailLower === 'admin' && u.email.toLowerCase() === 'admin@globetrotter.com')
  );

  if (!user) {
    return res.status(404).json({ error: 'No user found with this email/username. Please register first.' });
  }

  if (user.password !== password) {
    return res.status(401).json({ error: 'Incorrect password. Please try again.' });
  }

  if (user.status === 'Blocked') {
    return res.status(403).json({ error: 'Your account has been blocked. Please contact support.' });
  }

  // Calculate dynamic tripsCount on the fly
  user.tripsCount = db.trips.filter(t => t.userEmail.toLowerCase() === user.email.toLowerCase()).length;

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    language: user.language || 'en',
    currency: user.currency || 'USD',
    savedDestinations: user.savedDestinations || []
  });
});

// Register
app.post('/api/auth/register', (req, res) => {
  const { name, email, password, avatar } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  const emailLower = email.trim().toLowerCase();
  const isAdminEmail = emailLower === 'admin' || emailLower === 'admin@globetrotter.com' || emailLower === 'admin@example.com';
  if (isAdminEmail) {
    return res.status(400).json({ error: 'This email identifier is reserved. Please use a different email.' });
  }

  const db = readDb();
  const userExists = db.users.some(u => u.email.toLowerCase() === emailLower);
  if (userExists) {
    return res.status(409).json({ error: 'This email is already registered. Please sign in instead.' });
  }

  const newUser = {
    id: 'u_' + Date.now(),
    name: name.trim(),
    email: email.trim(),
    password: password,
    role: 'User',
    status: 'Active',
    tripsCount: 0,
    joined: new Date().toISOString().split('T')[0],
    avatar: avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    language: 'en',
    currency: 'USD',
    savedDestinations: []
  };

  db.users.push(newUser);
  writeDb(db);

  res.status(201).json({
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    avatar: newUser.avatar,
    language: newUser.language,
    currency: newUser.currency,
    savedDestinations: newUser.savedDestinations
  });
});

// ==================== TRIPS API ====================

// Fetch all trips for a user
app.get('/api/trips', (req, res) => {
  const userEmail = req.headers['x-user-email'];
  if (!userEmail) {
    return res.status(401).json({ error: 'Unauthorized: Missing user identity header' });
  }

  const db = readDb();
  const userTrips = db.trips.filter(t => t.userEmail.toLowerCase() === userEmail.toLowerCase().trim());
  res.json(userTrips);
});

// Save or Update a trip
app.post('/api/trips', (req, res) => {
  const userEmail = req.headers['x-user-email'];
  if (!userEmail) {
    return res.status(401).json({ error: 'Unauthorized: Missing user identity header' });
  }

  const tripData = req.body;
  if (!tripData || !tripData.name) {
    return res.status(400).json({ error: 'Trip data and name are required' });
  }

  const db = readDb();
  const index = db.trips.findIndex(t => t.id === tripData.id);

  const finalTrip = {
    ...tripData,
    userEmail: userEmail.trim()
  };

  if (index > -1) {
    // Check ownership
    if (db.trips[index].userEmail.toLowerCase() !== userEmail.toLowerCase().trim()) {
      return res.status(403).json({ error: 'Forbidden: You do not own this trip' });
    }
    db.trips[index] = finalTrip;
  } else {
    // Generate new ID if not present
    if (!finalTrip.id) {
      finalTrip.id = 't_' + Date.now();
    }
    db.trips.push(finalTrip);
  }

  // Update trips count in users list
  const user = db.users.find(u => u.email.toLowerCase() === userEmail.toLowerCase().trim());
  if (user) {
    user.tripsCount = db.trips.filter(t => t.userEmail.toLowerCase() === user.email.toLowerCase()).length;
  }

  writeDb(db);
  res.json(finalTrip);
});

// Delete a trip
app.delete('/api/trips/:id', (req, res) => {
  const userEmail = req.headers['x-user-email'];
  if (!userEmail) {
    return res.status(401).json({ error: 'Unauthorized: Missing user identity header' });
  }

  const db = readDb();
  const index = db.trips.findIndex(t => t.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Trip not found' });
  }

  if (db.trips[index].userEmail.toLowerCase() !== userEmail.toLowerCase().trim()) {
    return res.status(403).json({ error: 'Forbidden: You do not own this trip' });
  }

  db.trips.splice(index, 1);

  // Update trips count in users list
  const user = db.users.find(u => u.email.toLowerCase() === userEmail.toLowerCase().trim());
  if (user) {
    user.tripsCount = db.trips.filter(t => t.userEmail.toLowerCase() === user.email.toLowerCase()).length;
  }

  writeDb(db);
  res.json({ message: 'Trip deleted successfully' });
});

// ==================== PROFILE API ====================

// Update profile details
app.put('/api/profile', (req, res) => {
  const userEmail = req.headers['x-user-email'];
  if (!userEmail) {
    return res.status(401).json({ error: 'Unauthorized: Missing user identity header' });
  }

  const { name, email, avatar, language, currency, savedDestinations } = req.body;

  const db = readDb();
  const user = db.users.find(u => u.email.toLowerCase() === userEmail.toLowerCase().trim());

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // If email changes, check uniqueness
  if (email && email.toLowerCase().trim() !== user.email.toLowerCase()) {
    const emailExists = db.users.some(u => u.email.toLowerCase() === email.toLowerCase().trim());
    if (emailExists) {
      return res.status(409).json({ error: 'This new email is already taken by another account.' });
    }

    // Re-link their trips to the new email
    db.trips.forEach(t => {
      if (t.userEmail.toLowerCase() === user.email.toLowerCase()) {
        t.userEmail = email.toLowerCase().trim();
      }
    });

    user.email = email.toLowerCase().trim();
  }

  if (name) user.name = name.trim();
  if (avatar) user.avatar = avatar;
  if (language) user.language = language;
  if (currency) user.currency = currency;
  if (savedDestinations) user.savedDestinations = savedDestinations;

  writeDb(db);

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    language: user.language,
    currency: user.currency,
    savedDestinations: user.savedDestinations
  });
});

// Delete account
app.delete('/api/profile', (req, res) => {
  const userEmail = req.headers['x-user-email'];
  if (!userEmail) {
    return res.status(401).json({ error: 'Unauthorized: Missing user identity header' });
  }

  const db = readDb();
  const userIndex = db.users.findIndex(u => u.email.toLowerCase() === userEmail.toLowerCase().trim());

  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Remove their trips
  db.trips = db.trips.filter(t => t.userEmail.toLowerCase() !== userEmail.toLowerCase().trim());

  // Remove the user
  db.users.splice(userIndex, 1);

  writeDb(db);
  res.json({ message: 'Account and associated trips deleted successfully.' });
});

// ==================== ADMIN API ====================

// Get all users
app.get('/api/admin/users', (req, res) => {
  const userEmail = req.headers['x-user-email'];
  if (!userEmail) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const db = readDb();
  const requester = db.users.find(u => u.email.toLowerCase() === userEmail.toLowerCase().trim());
  if (!requester || requester.role !== 'Admin') {
    return res.status(403).json({ error: 'Forbidden: Admin access only' });
  }

  // Update trip counts on the fly before sending
  db.users.forEach(u => {
    u.tripsCount = db.trips.filter(t => t.userEmail.toLowerCase() === u.email.toLowerCase()).length;
  });

  res.json(db.users);
});

// Update user status (block/unblock)
app.put('/api/admin/users/:id/status', (req, res) => {
  const userEmail = req.headers['x-user-email'];
  const { status } = req.body; // 'Active' or 'Blocked'

  if (!userEmail) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const db = readDb();
  const requester = db.users.find(u => u.email.toLowerCase() === userEmail.toLowerCase().trim());
  if (!requester || requester.role !== 'Admin') {
    return res.status(403).json({ error: 'Forbidden: Admin access only' });
  }

  const user = db.users.find(u => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (user.role === 'Admin') {
    return res.status(400).json({ error: 'Cannot modify status of another Admin' });
  }

  user.status = status;
  writeDb(db);

  res.json(user);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

app.listen(PORT, () => {
  console.log(`GlobeTrotter backend running on port ${PORT}`);
});
