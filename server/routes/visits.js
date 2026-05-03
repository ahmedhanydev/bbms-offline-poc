// server/routes/visits.js
// Express routes for visit CRUD operations

const express = require('express');
const { run, get, all } = require('../database');
const router = express.Router();

// GET /api/visits - List all visits with donor info
router.get('/', async (req, res) => {
  try {
    const visits = await all(`
      SELECT 
        v.id as remoteId,
        v.visit_number as visitNumber,
        v.visit_date as visitDate,
        v.visit_type as visitType,
        v.donor_id as donorRemoteId,
        d.donor_number as donorNumber,
        d.first_name as donorFirstName,
        d.last_name as donorLastName,
        d.blood_type as donorBloodType,
        v.weight,
        v.blood_pressure_systolic as bloodPressureSystolic,
        v.blood_pressure_diastolic as bloodPressureDiastolic,
        v.pulse,
        v.temperature,
        v.hemoglobin,
        v.blood_bag_number as bloodBagNumber,
        v.blood_volume as bloodVolume,
        v.status,
        v.deferral_reason as deferralReason,
        v.deferral_until as deferralUntil,
        v.registered_by as registeredBy,
        v.screened_by as screenedBy,
        v.collected_by as collectedBy,
        v.notes,
        v.created_at as createdAt,
        v.updated_at as updatedAt,
        v.version
      FROM visits v
      JOIN donors d ON v.donor_id = d.id
      ORDER BY v.visit_date DESC
    `);
    res.json(visits);
  } catch (error) {
    console.error('[API] Error fetching visits:', error);
    res.status(500).json({ error: 'Failed to fetch visits' });
  }
});

// GET /api/visits/:id - Get single visit
router.get('/:id', async (req, res) => {
  try {
    const visit = await get(`
      SELECT 
        v.id as remoteId,
        v.visit_number as visitNumber,
        v.visit_date as visitDate,
        v.visit_type as visitType,
        v.donor_id as donorRemoteId,
        d.donor_number as donorNumber,
        d.first_name as donorFirstName,
        d.last_name as donorLastName,
        d.blood_type as donorBloodType,
        v.weight,
        v.blood_pressure_systolic as bloodPressureSystolic,
        v.blood_pressure_diastolic as bloodPressureDiastolic,
        v.pulse,
        v.temperature,
        v.hemoglobin,
        v.blood_bag_number as bloodBagNumber,
        v.blood_volume as bloodVolume,
        v.status,
        v.deferral_reason as deferralReason,
        v.deferral_until as deferralUntil,
        v.registered_by as registeredBy,
        v.screened_by as screenedBy,
        v.collected_by as collectedBy,
        v.notes,
        v.created_at as createdAt,
        v.updated_at as updatedAt,
        v.version
      FROM visits v
      JOIN donors d ON v.donor_id = d.id
      WHERE v.id = ?
    `, [req.params.id]);

    if (!visit) {
      return res.status(404).json({ error: 'Visit not found' });
    }

    res.json(visit);
  } catch (error) {
    console.error('[API] Error fetching visit:', error);
    res.status(500).json({ error: 'Failed to fetch visit' });
  }
});

// POST /api/visits - Create new visit
router.post('/', async (req, res) => {
  try {
    const {
      visitNumber,
      visitDate,
      visitType,
      donorRemoteId,
      weight,
      bloodPressureSystolic,
      bloodPressureDiastolic,
      pulse,
      temperature,
      hemoglobin,
      bloodBagNumber,
      bloodVolume,
      status,
      deferralReason,
      deferralUntil,
      registeredBy,
      screenedBy,
      collectedBy,
      notes,
    } = req.body;

    // Validation
    if (!visitNumber || !visitDate || !donorRemoteId) {
      return res.status(400).json({ error: 'Missing required fields: visitNumber, visitDate, donorRemoteId' });
    }

    // Verify donor exists
    const donor = await get('SELECT id FROM donors WHERE id = ?', [donorRemoteId]);
    if (!donor) {
      return res.status(400).json({ error: 'Donor not found' });
    }

    const now = Date.now();

    const result = await run(`
      INSERT INTO visits (
        visit_number, visit_date, visit_type, donor_id,
        weight, blood_pressure_systolic, blood_pressure_diastolic,
        pulse, temperature, hemoglobin,
        blood_bag_number, blood_volume, status,
        deferral_reason, deferral_until,
        registered_by, screened_by, collected_by, notes,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      visitNumber,
      visitDate,
      visitType || 'donation',
      donorRemoteId,
      weight || null,
      bloodPressureSystolic || null,
      bloodPressureDiastolic || null,
      pulse || null,
      temperature || null,
      hemoglobin || null,
      bloodBagNumber || '',
      bloodVolume || 0,
      status || 'pending',
      deferralReason || null,
      deferralUntil || null,
      registeredBy || '',
      screenedBy || '',
      collectedBy || '',
      notes || '',
      now,
      now,
    ]);

    // Update donor's last donation date and count if completed
    if (status === 'completed') {
      await run(`
        UPDATE donors SET
          last_donation_date = ?,
          total_donations = total_donations + 1,
          updated_at = ?
        WHERE id = ?
      `, [visitDate, now, donorRemoteId]);
    }

    // Fetch created visit
    const visit = await get(`
      SELECT 
        v.id as remoteId,
        v.visit_number as visitNumber,
        v.visit_date as visitDate,
        v.visit_type as visitType,
        v.donor_id as donorRemoteId,
        d.donor_number as donorNumber,
        d.first_name as donorFirstName,
        d.last_name as donorLastName,
        d.blood_type as donorBloodType,
        v.weight,
        v.blood_pressure_systolic as bloodPressureSystolic,
        v.blood_pressure_diastolic as bloodPressureDiastolic,
        v.pulse,
        v.temperature,
        v.hemoglobin,
        v.blood_bag_number as bloodBagNumber,
        v.blood_volume as bloodVolume,
        v.status,
        v.deferral_reason as deferralReason,
        v.deferral_until as deferralUntil,
        v.registered_by as registeredBy,
        v.screened_by as screenedBy,
        v.collected_by as collectedBy,
        v.notes,
        v.created_at as createdAt,
        v.updated_at as updatedAt,
        v.version
      FROM visits v
      JOIN donors d ON v.donor_id = d.id
      WHERE v.id = ?
    `, [result.id]);

    res.status(201).json(visit);
  } catch (error) {
    console.error('[API] Error creating visit:', error);
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Visit number already exists' });
    }
    res.status(500).json({ error: 'Failed to create visit' });
  }
});

// PUT /api/visits/:id - Update visit
router.put('/:id', async (req, res) => {
  try {
    const {
      visitNumber,
      visitDate,
      visitType,
      donorRemoteId,
      weight,
      bloodPressureSystolic,
      bloodPressureDiastolic,
      pulse,
      temperature,
      hemoglobin,
      bloodBagNumber,
      bloodVolume,
      status,
      deferralReason,
      deferralUntil,
      registeredBy,
      screenedBy,
      collectedBy,
      notes,
      version,
    } = req.body;

    // Check if visit exists
    const existing = await get('SELECT * FROM visits WHERE id = ?', [req.params.id]);
    if (!existing) {
      return res.status(404).json({ error: 'Visit not found' });
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
      UPDATE visits SET
        visit_number = COALESCE(?, visit_number),
        visit_date = COALESCE(?, visit_date),
        visit_type = COALESCE(?, visit_type),
        donor_id = COALESCE(?, donor_id),
        weight = COALESCE(?, weight),
        blood_pressure_systolic = COALESCE(?, blood_pressure_systolic),
        blood_pressure_diastolic = COALESCE(?, blood_pressure_diastolic),
        pulse = COALESCE(?, pulse),
        temperature = COALESCE(?, temperature),
        hemoglobin = COALESCE(?, hemoglobin),
        blood_bag_number = COALESCE(?, blood_bag_number),
        blood_volume = COALESCE(?, blood_volume),
        status = COALESCE(?, status),
        deferral_reason = COALESCE(?, deferral_reason),
        deferral_until = COALESCE(?, deferral_until),
        registered_by = COALESCE(?, registered_by),
        screened_by = COALESCE(?, screened_by),
        collected_by = COALESCE(?, collected_by),
        notes = COALESCE(?, notes),
        updated_at = ?,
        version = ?
      WHERE id = ?
    `, [
      visitNumber,
      visitDate,
      visitType,
      donorRemoteId,
      weight,
      bloodPressureSystolic,
      bloodPressureDiastolic,
      pulse,
      temperature,
      hemoglobin,
      bloodBagNumber,
      bloodVolume,
      status,
      deferralReason,
      deferralUntil,
      registeredBy,
      screenedBy,
      collectedBy,
      notes,
      now,
      newVersion,
      req.params.id,
    ]);

    // Update donor stats if status changed to completed
    if (status === 'completed' && existing.status !== 'completed') {
      await run(`
        UPDATE donors SET
          last_donation_date = ?,
          total_donations = total_donations + 1,
          updated_at = ?
        WHERE id = ?
      `, [visitDate || existing.visit_date, now, donorRemoteId || existing.donor_id]);
    }

    // Fetch updated visit
    const visit = await get(`
      SELECT 
        v.id as remoteId,
        v.visit_number as visitNumber,
        v.visit_date as visitDate,
        v.visit_type as visitType,
        v.donor_id as donorRemoteId,
        d.donor_number as donorNumber,
        d.first_name as donorFirstName,
        d.last_name as donorLastName,
        d.blood_type as donorBloodType,
        v.weight,
        v.blood_pressure_systolic as bloodPressureSystolic,
        v.blood_pressure_diastolic as bloodPressureDiastolic,
        v.pulse,
        v.temperature,
        v.hemoglobin,
        v.blood_bag_number as bloodBagNumber,
        v.blood_volume as bloodVolume,
        v.status,
        v.deferral_reason as deferralReason,
        v.deferral_until as deferralUntil,
        v.registered_by as registeredBy,
        v.screened_by as screenedBy,
        v.collected_by as collectedBy,
        v.notes,
        v.created_at as createdAt,
        v.updated_at as updatedAt,
        v.version
      FROM visits v
      JOIN donors d ON v.donor_id = d.id
      WHERE v.id = ?
    `, [req.params.id]);

    res.json(visit);
  } catch (error) {
    console.error('[API] Error updating visit:', error);
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Visit number already exists' });
    }
    res.status(500).json({ error: 'Failed to update visit' });
  }
});

module.exports = router;
