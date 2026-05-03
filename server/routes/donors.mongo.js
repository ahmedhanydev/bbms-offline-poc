// server/routes/donors.mongo.js
// Donor routes using MongoDB/Mongoose

const express = require('express');
const router = express.Router();
const Donor = require('../models/Donor');
const { v4: uuidv4 } = require('uuid');

// GET /api/donors - List all donors
router.get('/', async (req, res, next) => {
  try {
    const { bloodType, city, search, page = 1, limit = 50 } = req.query;
    
    // Build filter
    const filter = {};
    if (bloodType) filter.bloodType = bloodType;
    if (city) filter.city = { $regex: city, $options: 'i' };
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { donorNumber: { $regex: search, $options: 'i' } },
        { nationalId: { $regex: search, $options: 'i' } }
      ];
    }

    const donors = await Donor.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Donor.countDocuments(filter);

    res.json({
      donors,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/donors/stats - Get donor statistics
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await Donor.aggregate([
      {
        $group: {
          _id: '$bloodType',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalDonors = await Donor.countDocuments();
    const totalDonations = await Donor.aggregate([
      { $group: { _id: null, total: { $sum: '$totalDonations' } } }
    ]);

    res.json({
      totalDonors,
      totalDonations: totalDonations[0]?.total || 0,
      byBloodType: stats.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {})
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/donors/:id - Get donor by ID
router.get('/:id', async (req, res, next) => {
  try {
    const donor = await Donor.findById(req.params.id);
    
    if (!donor) {
      return res.status(404).json({ error: 'Donor not found' });
    }

    res.json(donor);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ error: 'Donor not found' });
    }
    next(error);
  }
});

// POST /api/donors - Create donor
router.post('/', async (req, res, next) => {
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
      version = 1
    } = req.body;

    // Validation
    if (!firstName || !lastName || !nationalId || !dateOfBirth || !gender || !bloodType || !phone || !address || !city) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['firstName', 'lastName', 'nationalId', 'dateOfBirth', 'gender', 'bloodType', 'phone', 'address', 'city']
      });
    }

    // Generate donor number if not provided
    const finalDonorNumber = donorNumber || `DON-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const donor = new Donor({
      donorNumber: finalDonorNumber,
      nationalId,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      bloodType,
      phone,
      email: email || '',
      address,
      city,
      emergencyContactName: emergencyContactName || '',
      emergencyContactPhone: emergencyContactPhone || '',
      lastDonationDate: lastDonationDate || null,
      totalDonations: totalDonations || 0,
      isEligible: isEligible !== undefined ? isEligible : true,
      notes: notes || '',
      version
    });

    await donor.save();

    res.status(201).json(donor);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ 
        error: 'Duplicate entry',
        field: Object.keys(error.keyValue)[0],
        message: `${Object.keys(error.keyValue)[0]} already exists`
      });
    }
    next(error);
  }
});

// PUT /api/donors/:id - Update donor
router.put('/:id', async (req, res, next) => {
  try {
    const { version, ...updateData } = req.body;
    
    // Find donor first to check version
    const donor = await Donor.findById(req.params.id);
    
    if (!donor) {
      return res.status(404).json({ error: 'Donor not found' });
    }

    // Optimistic locking - check version
    if (version !== undefined && donor.version !== version) {
      return res.status(409).json({
        error: 'Conflict detected',
        message: 'Donor has been modified by another user',
        serverVersion: donor.version,
        serverData: donor
      });
    }

    // Apply updates
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        donor[key] = updateData[key];
      }
    });

    // Increment version
    donor.version = donor.version + 1;
    donor.updatedAt = new Date();

    await donor.save();

    res.json(donor);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ error: 'Donor not found' });
    }
    if (error.code === 11000) {
      return res.status(409).json({ 
        error: 'Duplicate entry',
        field: Object.keys(error.keyValue)[0]
      });
    }
    next(error);
  }
});

// DELETE /api/donors/:id - Delete donor
router.delete('/:id', async (req, res, next) => {
  try {
    const donor = await Donor.findByIdAndDelete(req.params.id);
    
    if (!donor) {
      return res.status(404).json({ error: 'Donor not found' });
    }

    res.json({ message: 'Donor deleted successfully' });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ error: 'Donor not found' });
    }
    next(error);
  }
});

module.exports = router;
