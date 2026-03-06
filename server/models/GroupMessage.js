const mongoose = require('mongoose');

const groupMessageSchema = new mongoose.Schema({
    group_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    sender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, default: 'user' },
    content: { type: String, default: '' },
    type: { type: String, enum: ['text', 'image', 'file', 'system', 'audio'], default: 'text' },
    file_path: { type: String },
    fileName: { type: String },
    fileSize: { type: Number },
    duration: { type: Number }, // Optional, for Audio
    is_view_once: { type: Boolean, default: false },
    is_system: { type: Boolean, default: false }, // For "You created this group" type messages
    is_pinned: { type: Boolean, default: false },
    pinned_at: { type: Date },
    pin_expires_at: { type: Date },
    pinned_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    starred_by: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    read_by: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    is_read: { type: Boolean, default: false },
    created_at: { type: Date, default: Date.now }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

module.exports = mongoose.model('GroupMessage', groupMessageSchema);
