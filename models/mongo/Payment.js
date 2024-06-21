const { ObjectId } = require('mongodb');

module.exports = {
    token_id: { type: ObjectId, required: true },
    drop_id: { type: ObjectId, required: true },
    amount: { type: Number, required: true },
    callback_sent: { type: Boolean, default: false },
    success_url: { type: String, required: true },
    fail_url: { type: String, required: true },
    method: { type: String, enum: ['qw', 'card'], required: true },
    error: { type: String },
    pay_link: { type: String },
    status: { type: String, enum: ['pending', 'processing', 'paid', 'failed'], default: 'pending' }
}