// server/routes/visits.mongo.js
// Visit routes using MongoDB/Mongoose

const express = require('express');
const router = express.Router();
const Visit = require('../models/Visit');
const Donor = require('../models/Donor');

// GET /api/visits - List all visits
router.get('/', async (req, res, next) => {
  try {
    const { donorId, status, fromDate, toDate, page = 1, limit = 50 } = req.query;
    
    // Build filter
    const filter = {};
    if (donorId) filter.donorId = donorId;
    if (status) filter.status = status;
    if (fromDate || toDate) {
      filter.visitDate = {};
      if (fromDate) filter.visitDate.$gte = fromDate;
      if (toDate) filter.visitDate.$lte = toDate;
    }

    const visits = await Visit.find(filter)
      .populate('donorId', 'firstName lastName donorNumber bloodType')
      .sort({ visitDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Visit.countDocuments(filter);

    // Transform to match expected format
    const transformedVisits = visits.map(visit => ({
      ...visit.toJSON(),
      donor: visit.donorId ? {
        id: visit.donorId._id.toString(),
        firstName: visit.donorId.firstName,
        lastName: visit.donorId.lastName,
        donorNumber: visit.donorId.donorNumber,
        bloodType: visit.donorId.bloodType
      } : null
    }));

    res.json({
      visits: transformedVisits,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/visits/:id - Get visit by ID
router.get('/:id', async (req, res, next) => {
  try {
    const visit = await Visit.findById(req.params.id)
      .populate('donorId', 'firstName lastName donorNumber bloodType');
    
    if (!visit) {
      return res.status(404).json({ error: 'Visit not found' });
    }

    const transformedVisit = {
      ...visit.toJSON(),
      donor: visit.donorId ? {
        id: visit.donorId._id.toString(),
        firstName: visit.donorId.firstName,
        lastName: visit.donorId.lastName,
        donorNumber: visit.donorId.donorNumber,
        bloodType: visit.donorId.bloodType
      } : null
    };

    res.json(transformedVisit);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ error: 'Visit not found' });
    }
    next(error);
  }
});

// POST /api/visits - Create visit
router.post('/', async (req, res, next) => {
  try {
    const {
      visitNumber,
      visitDate,
      visitType,
      donorRemoteId,  // This is the MongoDB ObjectId as string
      donorId,
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
      version = 1
    } = req.body;

    // Validation
    if (!visitDate || !visitType || !donorRemoteId) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['visitDate', 'visitType', 'donorRemoteId']
      });
    }

    // Verify donor exists
    const donor = await Donor.findById(donorRemoteId);
    if (!donor) {
      return res.status(404).json({ 
        error: 'Donor not found',
        donorRemoteId
      });
    }

    // Generate visit number if not provided
    const finalVisitNumber = visitNumber || `VIS-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const visit = new Visit({
      visitNumber: finalVisitNumber,
      visitDate,
      visitType,
      donorId: donorRemoteId,  // MongoDB ObjectId
      donorRemoteId: donorRemoteId.toString(),
      weight: weight || null,
      bloodPressureSystolic: bloodPressureSystolic || null,
      bloodPressureDiastolic: bloodPressureDiastolic || null,
      pulse: pulse || null,
      temperature: temperature || null,
      hemoglobin: hemoglobin || null,
      bloodBagNumber: bloodBagNumber || '',
      bloodVolume: bloodVolume || 0,
      status: status || 'pending',
      deferralReason: deferralReason || null,
      deferralUntil: deferralUntil || null,
      registeredBy: registeredBy || '',
      screenedBy: screenedBy || '',
      collectedBy: collectedBy || '',
      notes: notes || '',
      version
    });

    await visit.save();

    // Update donor's last donation info if this is a completed donation
    if (status === 'completed' && visitType === 'donation') {
      donor.lastDonationDate = visitDate;
      donor.totalDonations = (donor.totalDonations || 0) + 1;
      await donor.save();
    }

    // Populate donor info for response
    await visit.populate('donorId', 'firstName lastName donorNumber bloodType');

    const transformedVisit = {
      ...visit.toJSON(),
      donor: visit.donorId ? {
        id: visit.donorId._id.toString(),
        firstName: visit.donorId.firstName,
        lastName: visit.donorId.lastName,
        donorNumber: visit.donorId.donorNumber,
        bloodType: visit.donorId.bloodType
      } : null
    };

    res.status(201).json(transformedVisit);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ 
        error: 'Duplicate entry',
        field: Object.keys(error.keyValue)[0]
      });
    }
    next(error);
  }
});

// PUT /api/visits/:id - Update visit
router.put('/:id', async (req, res, next) => {
  try {
    const { version, ...updateData } = req.body;
    
    // Find visit first to check version
    const visit = await Visit.findById(req.params.id);
    
    if (!visit) {
      return res.status(404).json({ error: 'Visit not found' });
    }

    // Optimistic locking
    if (version !== undefined && visit.version !== version) {
      await visit.populate('donorId', 'firstName lastName donorNumber bloodType');
      
      return res.status(409).json({
        error: 'Conflict detected',
        message: 'Visit has been modified by another user',
        serverVersion: visit.version,
        serverData: {
          ...visit.toJSON(),
          donor: visit.donorId ? {
            id: visit.donorId._id.toString(),
            firstName: visit.donorId.firstName,
            lastName: visit.donorId.lastName,
            donorNumber: visit.donorId.donorNumber,
            bloodType: visit.donorId.bloodType
          } : null
        }
      });
    }

    // Apply updates
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined && key !== 'donorRemoteId') {
        visit[key] = updateData[key];
      }
    });

    // Handle donorRemoteId separately
    if (updateData.donorRemoteId) {
      const donor = await Donor.findById(updateData.donorRemoteId);
      if (!donor) {
        return res.status(404).json({ error: 'Donor not found' });
      }
      visit.donorId = updateData.donorRemoteId;
      visit.donorRemoteId = updateData.donorRemoteId;
    }

    // Increment version
    visit.version = visit.version + 1;
    visit.updatedAt = new Date();

    await visit.save();
    await visit.populate('donorId', 'firstName lastName donorNumber bloodType');

    const transformedVisit = {
      ...visit.toJSON(),
      donor: visit.donorId ? {
        id: visit.donorId._id.toString(),
        firstName: visit.donorId.firstName,
        lastName: visit.donorId.lastName,
        donorNumber: visit.donorId.donorNumber,
        bloodType: visit.donorId.bloodType
      } : null
    };

    res.json(transformedVisit);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ error: 'Visit not found' });
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

// DELETE /api/visits/:id - Delete visit
router.delete('/:id', async (req, res, next) => {
  try {
    const visit = await Visit.findByIdAndDelete(req.params.id);
    
    if (!visit) {
      return res.status(404).json({ error: 'Visit not found' });
    }

    res.json({ message: 'Visit deleted successfully' });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ error: 'Visit not found' });
    }
    next(error);
  }
});

module.exports = router;
