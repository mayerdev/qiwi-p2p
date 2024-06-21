const { ObjectId } = require('mongodb');

module.exports = {
    drop_id: { type: ObjectId, required: true },
    ip: { type: String, required: true },
    port: { type: String, required: true },
    username: { type: String, required: true },
    password: { type: String, required: true }
}