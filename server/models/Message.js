const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // Added for P2P
    role: { type: String, required: true }, // 'user', 'ai' (model)
    content: { type: String },
    type: { type: String, enum: ['text', 'image', 'file', 'audio'], default: 'text' },
    file_path: { type: String },
    fileName: { type: String },
    fileSize: { type: Number }, // in bytes
    pageCount: { type: Number }, // optional, for PDFs
    duration: { type: Number }, // optional, for Audio
    is_view_once: { type: Boolean, default: false },
    reply_to: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
    link_preview: {
        title: { type: String },
        description: { type: String },
        image: { type: String },
        url: { type: String },
        domain: { type: String }
    },
    is_pinned: { type: Boolean, default: false },
    starred_by: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    is_deleted_by_admin: { type: Boolean, default: false },
    is_deleted_by_user: { type: Boolean, default: false },
    deleted_for: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Array of user IDs who deleted this message for themselves
    is_flagged: { type: Boolean, default: false },
    flag_reason: { type: String, default: '' },

    is_forwarded: { type: Boolean, default: false },
    forward_count: { type: Number, default: 0 },
    is_read: { type: Boolean, default: false },
    read_at: { type: Date, default: null },
    created_at: { type: Date, default: Date.now }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

module.exports = mongoose.model('Message', messageSchema);