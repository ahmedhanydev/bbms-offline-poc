// server/routes/donors.js
// Express routes for donor CRUD operations

const express = require('express');
const { run, get, all } = require('../database');
const router = express.Router();

// GET /api/donors - List all donors
router.get('/', async (req, res) => {
  try {
    const donors = await all(`
      SELECT 
        id as remoteId,
        donor_number as donorNumber,
        national_id as nationalId,
        first_name as firstName,
        last_name as lastName,
        date_of_birth as dateOfBirth,
        gender,
        blood_type as bloodType,
        phone,
        email,
        address,
        city,
        emergency_contact_name as emergencyContactName,
        emergency_contact_phone as emergencyContactPhone,
        last_donation_date as lastDonationDate,
        total_donations as totalDonations,
        is_eligible as isEligible,
        notes,
        created_at as createdAt,
        updated_at as updatedAt,
        version
      FROM donors 
      ORDER BY created_at DESC
    `);
    res.json(donors);
  } catch (error) {
    console.error('[API] Error fetching donors:', error);
    res.status(500).json({ error: 'Failed to fetch donors' });
  }
});

// GET /api/donors/:id - Get single donor
router.get('/:id', async (req, res) => {
  try {
    const donor = await get(`
      SELECT 
        id as remoteId,
        donor_number as donorNumber,
        national_id as nationalId,
        first_name as firstName,
        last_name as lastName,
        date_of_birth as dateOfBirth,
        gender,
        blood_type as bloodType,
        phone,
        email,
        address,
        city,
        emergency_contact_name as emergencyContactName,
        emergency_contact_phone as emergencyContactPhone,
        last_donation_date as lastDonationDate,
        total_donations as totalDonations,
        is_eligible as isEligible,
        notes,
        created_at as createdAt,
        updated_at as updatedAt,
        version
      FROM donors 
      WHERE id = ?
    `, [req.params.id]);

    if (!donor) {
      return res.status(404).json({ error: 'Donor not found' });
    }

    res.json(donor);
  } catch (error) {
    console.error('[API] Error fetching donor:', error);
    res.status(500).json({ error: 'Failed to fetch donor' });
  }
});

// POST /api/donors - Create new donor
router.post('/', async (req, res) => {
  try {
    const {
      donorNumber,
      nationalId,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      bloodType,
      phone,
      email,
      address,
      city,
      emergencyContactName,
      emergencyContactPhone,
      notes,
    } = req.body;

    // Validation
    if (!donorNumber || !nationalId || !firstName || !lastName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const now = Date.now();

    const result = await run(`
      INSERT INTO donors (
        donor_number, national_id, first_name, last_name, date_of_birth,
        gender, blood_type, phone, email, address, city,
        emergency_contact_name, emergency_contact_phone, notes,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      donorNumber,
      nationalId,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      bloodType,
      phone || '',
      email || '',
      address || '',
      city || '',
      emergencyContactName || '',
      emergencyContactPhone || '',
      notes || '',
      now,
      now,
    ]);

    // Fetch the created donor
    const donor = await get(`
      SELECT 
        id as remoteId,
        donor_number as donorNumber,
        national_id as nationalId,
        first_name as firstName,
        last_name as lastName,
        date_of_birth as dateOfBirth,
        gender,
        blood_type as bloodType,
        phone,
        email,
        address,
        city,
        emergency_contact_name as emergencyContactName,
        emergency_contact_phone as emergencyContactPhone,
        last_donation_date as lastDonationDate,
        total_donations as totalDonations,
        is_eligible as isEligible,
        notes,
        created_at as createdAt,
        updated_at as updatedAt,
        version
      FROM donors 
      WHERE id = ?
    `, [result.id]);

    res.status(201).json(donor);
  } catch (error) {
    console.error('[API] Error creating donor:', error);
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Donor number or national ID already exists' });
    }
    res.status(500).json({ error: 'Failed to create donor' });
  }
});

// PUT /api/donors/:id - Update donor
router.put('/:id', async (req, res) => {
  try {
    const {
      donorNumber,
      nationalId,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      bloodType,
      phone,
      email,
      address,
      city,
      emergencyContactName,
      emergencyContactPhone,
      lastDonationDate,
      totalDonations,
      isEligible,
      notes,
      version, // For optimistic locking
    } = req.body;

    // Check if donor exists
    const existing = await get('SELECT * FROM donors WHERE id = ?', [req.params.id]);
    if (!existing) {
      return res.status(404).json({ error: 'Donor not found' });
    }

    // Optimistic locking check
    if (version && existing.version !== version) {
      return res.status(409).json({
        error: 'Conflict detected',
        serverVersion: existing.version,
        ...existing,
      });
    }

    const now = Date.now();
    const newVersion = (existing.version || 1) + 1;

    await run(`
      UPDATE donors SET
        donor_number = COALESCE(?, donor_number),
        national_id = COALESCE(?, national_id),
        first_name = COALESCE(?, first_name),
        last_name = COALESCE(?, last_name),
        date_of_birth = COALESCE(?, date_of_birth),
        gender = COALESCE(?, gender),
        blood_type = COALESCE(?, blood_type),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        address = COALESCE(?, address),
        city = COALESCE(?, city),
        emergency_contact_name = COALESCE(?, emergency_contact_name),
        emergency_contact_phone = COALESCE(?, emergency_contact_phone),
        last_donation_date = COALESCE(?, last_donation_date),
        total_donations = COALESCE(?, total_donations),
        is_eligible = COALESCE(?, is_eligible),
        notes = COALESCE(?, notes),
        updated_at = ?,
        version = ?
      WHERE id = ?
    `, [
      donorNumber,
      nationalId,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      bloodType,
      phone,
      email,
      address,
      city,
      emergencyContactName,
      emergencyContactPhone,
      lastDonationDate,
      totalDonations,
      isEligible !== undefined ? (isEligible ? 1 : 0) : null,
      notes,
      now,
      newVersion,
      req.params.id,
    ]);

    // Fetch updated donor
    const donor = await get(`
      SELECT 
        id as remoteId,
        donor_number as donorNumber,
        national_id as nationalId,
        first_name as firstName,
        last_name as lastName,
        date_of_birth as dateOfBirth,
        gender,
        blood_type as bloodType,
        phone,
        email,
        address,
        city,
        emergency_contact_name as emergencyContactName,
        emergency_contact_phone as emergencyContactPhone,
        last_donation_date as lastDonationDate,
        total_donations as totalDonations,
        is_eligible as isEligible,
        notes,
        created_at as createdAt,
        updated_at as updatedAt,
        version
      FROM donors 
      WHERE id = ?
    `, [req.params.id]);

    res.json(donor);
  } catch (error) {
    console.error('[API] Error updating donor:', error);
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Donor number or national ID already exists' });
    }
    res.status(500).json({ error: 'Failed to update donor' });
  }
});

module.exports = router;
