const express = require('express');
const router = express.Router();
const MatrimonyProfile = require('../models/MatrimonyProfile');
const User = require('../models/User');
const auth = require('../middleware/auth');

// GET /api/matrimony/profile — Get current user's matrimony profile
router.get('/profile', auth, async (req, res) => {
  try {
    let profile = await MatrimonyProfile.findOne({ userId: req.user._id })
      .populate('userId', 'name profilePic');
    res.json({ profile });
  } catch (err) {
    console.error('Get matrimony profile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/matrimony/profile — Create or update matrimony profile
router.post('/profile', auth, async (req, res) => {
  try {
    const data = req.body;
    let profile = await MatrimonyProfile.findOne({ userId: req.user._id });

    if (profile) {
      Object.assign(profile, data);
      await profile.save();
    } else {
      profile = new MatrimonyProfile({ userId: req.user._id, ...data });
      await profile.save();
    }

    await profile.populate('userId', 'name profilePic');
    res.json({ profile });
  } catch (err) {
    console.error('Save matrimony profile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/matrimony/browse — Browse profiles with filters
router.get('/browse', auth, async (req, res) => {
  try {
    const {
      gender, ageMin, ageMax, city, religion,
      education, occupation, maritalStatus, income, motherTongue, state,
      sort = 'newest',
      page = 1, limit = 20,
    } = req.query;

    const query = {
      userId: { $ne: req.user._id },
      isActive: true,
    };

    if (gender) query.gender = gender;
    if (ageMin || ageMax) {
      query.age = {};
      if (ageMin) query.age.$gte = parseInt(ageMin);
      if (ageMax) query.age.$lte = parseInt(ageMax);
    }
    if (city) query.city = new RegExp(city, 'i');
    if (state) query.state = new RegExp(state, 'i');
    if (religion) query.religion = new RegExp(religion, 'i');
    if (education) query.education = new RegExp(education, 'i');
    if (occupation) query.occupation = new RegExp(occupation, 'i');
    if (motherTongue) query.motherTongue = new RegExp(motherTongue, 'i');
    if (maritalStatus) query.maritalStatus = maritalStatus;
    if (income) query.income = new RegExp(income, 'i');

    // Sorting
    let sortObj = { createdAt: -1 };
    if (sort === 'oldest') sortObj = { createdAt: 1 };
    else if (sort === 'age_asc') sortObj = { age: 1 };
    else if (sort === 'age_desc') sortObj = { age: -1 };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await MatrimonyProfile.countDocuments(query);
    const profiles = await MatrimonyProfile.find(query)
      .populate('userId', 'name profilePic isOnline')
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit));

    // Check which ones the user has already sent interest to
    const myProfile = await MatrimonyProfile.findOne({ userId: req.user._id });
    const myInterests = myProfile?.interests?.map(i => i.userId.toString()) || [];

    const enriched = profiles.map(p => ({
      ...p.toObject(),
      interestSent: myInterests.includes(p.userId._id.toString()),
    }));

    res.json({ profiles: enriched, total, page: parseInt(page), hasMore: skip + profiles.length < total });
  } catch (err) {
    console.error('Browse error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/matrimony/interest/:profileId — Send interest
router.post('/interest/:profileId', auth, async (req, res) => {
  try {
    const targetProfile = await MatrimonyProfile.findById(req.params.profileId);
    if (!targetProfile) return res.status(404).json({ error: 'Profile not found' });

    // Check if already sent
    const myProfile = await MatrimonyProfile.findOne({ userId: req.user._id });
    if (!myProfile) return res.status(400).json({ error: 'Create your profile first' });

    const existing = myProfile.interests.find(
      i => i.userId.toString() === targetProfile.userId.toString()
    );
    if (existing) return res.status(400).json({ error: 'Interest already sent' });

    myProfile.interests.push({ userId: targetProfile.userId, status: 'sent' });
    await myProfile.save();

    res.json({ message: 'Interest sent successfully' });
  } catch (err) {
    console.error('Send interest error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/matrimony/interests — Get received interests
router.get('/interests', auth, async (req, res) => {
  try {
    // Find profiles that have sent interest to current user
    const profiles = await MatrimonyProfile.find({
      'interests.userId': req.user._id,
    }).populate('userId', 'name profilePic');

    const received = profiles.map(p => {
      const interest = p.interests.find(i => i.userId.toString() === req.user._id.toString());
      return {
        profile: p,
        status: interest?.status || 'sent',
        sentAt: interest?.createdAt,
      };
    });

    res.json({ interests: received });
  } catch (err) {
    console.error('Get interests error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
