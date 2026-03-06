const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    mobile: { type: String, unique: true, required: true },
    designation: { type: String },
    about: { type: String, default: 'Available' },
    login_id: { type: String, unique: true, sparse: true }, // sparse allows null/undefined to not clash
    password: { type: String },
    password_signature: { type: String, select: false }, // For uniqueness check (SHA256 + Pepper)
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    status: { type: String, enum: ['pending', 'approved'], default: 'pending' },
    token_version: { type: Number, default: 0 },
    is_temporary_password: { type: Boolean, default: false },
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },
    created_at: { type: Date, default: Date.now }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

module.exports = mongoose.model('User', userSchema);
