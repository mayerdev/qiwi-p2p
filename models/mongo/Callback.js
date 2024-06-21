const { ObjectId } = require('mongodb');

module.exports = {
    payment_id: { type: ObjectId, required: true },
    callback_url: { type: String, required: true },
    code: { type: Number, required: true },
    body: { type: String, required: true }
}