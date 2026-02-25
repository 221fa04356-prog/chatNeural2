const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Group = require('../models/Group');
const GroupMessage = require('../models/GroupMessage');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'neural_secret_77';

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        console.warn('[GROUPS AUTH] No token provided');
        return res.status(401).json({ error: 'Access denied' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error('[GROUPS AUTH] Token verification failed:', err.message);
            return res.status(403).json({ error: 'Invalid token' });
        }
        console.log('[GROUPS AUTH] Token verified for:', user.id);
        req.user = user;
        next();
    });
};

// POST /api/groups/create - Create a new group
router.post('/create', authenticateToken, async (req, res) => {
    try {
        console.log('[GROUP CREATE] req.body:', JSON.stringify(req.body, null, 2));
        const { name, icon, memberIds, permissions } = req.body;
        const adminId = req.user.id;

        if (!memberIds || memberIds.length === 0) {
            return res.status(400).json({ error: 'At least one member required' });
        }

        // Ensure admin is in members list and filter out any invalid IDs
        const allMembers = [...new Set([adminId, ...memberIds])].filter(id => id);

        console.log('[GROUP CREATE] Creating group with admin:', adminId, 'and members:', memberIds);

        const group = await Group.create({
            name: name || '',
            icon: icon || null,
            members: allMembers,
            admin: adminId,
            permissions: permissions || { editSettings: true, sendMessages: true }
        });

        console.log('[GROUP CREATE] Group created successfully:', group._id);

        // Populate members for response
        const populatedGroup = await Group.findById(group._id)
            .populate('members', 'name email _id isOnline lastSeen')
            .populate('admin', 'name _id');

        // Create the system message "group created"
        await GroupMessage.create({
            group_id: group._id,
            sender_id: adminId,
            type: 'system',
            is_system: true,
            content: 'created this group'
        });

        // Emit socket event to all members
        if (req.io) {
            allMembers.forEach(memberId => {
                if (memberId) {
                    req.io.to(memberId.toString()).emit('group_created', {
                        group: populatedGroup,
                        createdBy: adminId
                    });
                }
            });
        }

        res.json({ status: 'created', group: populatedGroup });
    } catch (err) {
        console.error('[GROUP CREATE ERROR] Full detail:', err);
        // Specifically check for validation errors
        if (err.name === 'ValidationError') {
            return res.status(400).json({ error: 'Validation failed: ' + Object.keys(err.errors).map(k => err.errors[k].message).join(', ') });
        }
        res.status(500).json({ error: err.message || 'Internal server error in group creation' });
    }
});

// GET /api/groups/my-groups - Get all groups for current user
router.get('/my-groups', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        // 0. Get current user's favorites once
        const currentUserObj = await User.findById(userId).select('favorites');
        const userFavorites = currentUserObj?.favorites || [];

        const groups = await Group.find({ members: userId })
            .populate('members', 'name email _id isOnline lastSeen')
            .populate('admin', 'name _id')
            .sort({ created_at: -1 });

        // Enrich each group with last message and unread count
        const enriched = await Promise.all(groups.map(async (g) => {
            const lastMsg = await GroupMessage.findOne({ group_id: g._id })
                .sort({ created_at: -1 })
                .populate('sender_id', 'name')
                .lean();

            return {
                ...g.toObject(),
                lastMessage: lastMsg,
                isGroup: true,
                isFavorite: userFavorites.some(favId => String(favId) === String(g._id))
            };
        }));

        res.json(enriched);
    } catch (err) {
        console.error('[MY GROUPS ERROR]', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/groups/:groupId/messages - Get messages for a group
router.get('/:groupId/messages', authenticateToken, async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user.id;

        // Ensure user is a member
        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ error: 'Group not found' });
        if (!group.members.map(m => m.toString()).includes(userId)) {
            return res.status(403).json({ error: 'Not a group member' });
        }

        const messages = await GroupMessage.find({ group_id: groupId })
            .populate('sender_id', 'name _id')
            .sort({ created_at: 1 });

        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/groups/:groupId/send - Send a message to a group
router.post('/:groupId/send', authenticateToken, async (req, res) => {
    try {
        const { groupId } = req.params;
        const { content } = req.body;
        const senderId = req.user.id;

        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ error: 'Group not found' });
        if (!group.members.map(m => m.toString()).includes(senderId)) {
            return res.status(403).json({ error: 'Not a group member' });
        }

        const msg = await GroupMessage.create({
            group_id: groupId,
            sender_id: senderId,
            content: content || '',
            type: 'text'
        });

        const populated = await GroupMessage.findById(msg._id)
            .populate('sender_id', 'name _id');

        // Emit to all group members
        if (req.io) {
            group.members.forEach(memberId => {
                req.io.to(memberId.toString()).emit('group_message', {
                    groupId,
                    message: populated
                });
            });
        }

        res.json({ status: 'sent', message: populated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/groups/:groupId/name - Update group name
router.patch('/:groupId/name', authenticateToken, async (req, res) => {
    try {
        const { groupId } = req.params;
        const { name } = req.body;
        const userId = req.user.id;

        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ error: 'Group not found' });
        if (!group.members.map(m => m.toString()).includes(userId)) {
            return res.status(403).json({ error: 'Not a group member' });
        }

        group.name = name || '';
        await group.save();

        // Emit update to all members
        if (req.io) {
            group.members.forEach(memberId => {
                req.io.to(memberId.toString()).emit('group_updated', { groupId, name: group.name });
            });
        }

        res.json({ status: 'updated', group });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Toggle Star for Group Message
router.post('/message/:id/toggle', authenticateToken, async (req, res) => {
    const { action, value } = req.body;
    const userId = req.user.id;

    try {
        const msg = await GroupMessage.findById(req.params.id);
        if (!msg) return res.status(404).json({ error: 'Group message not found' });

        if (action === 'star') {
            if (!msg.starred_by) msg.starred_by = [];
            const index = msg.starred_by.indexOf(userId);
            if (value && index === -1) {
                msg.starred_by.push(userId);
            } else if (!value && index > -1) {
                msg.starred_by.splice(index, 1);
            }
        }

        await msg.save();
        res.json({ status: 'success', is_starred: msg.starred_by.includes(userId) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
