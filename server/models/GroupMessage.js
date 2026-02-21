const mongoose = require('mongoose');

const groupMessageSchema = new mongoose.Schema({
    group_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    sender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, default: 'user' },
    content: { type: String, default: '' },
    type: { type: String, enum: ['text', 'image', 'file', 'system'], default: 'text' },
    file_path: { type: String },
    fileName: { type: String },
    fileSize: { type: Number },
    is_system: { type: Boolean, default: false }, // For "You created this group" type messages
    created_at: { type: Date, default: Date.now }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

module.exports = mongoose.model('GroupMessage', groupMessageSchema);
