module.exports = {
    phone: { type: String, required: true },
    password: { type: String, required: true },
    access_token: { type: String, required: true },
    p2p_public: { type: String, required: true },
    p2p_secret: { type: String, required: true },
    min_amount: { type: Number, required: true },
    max_amount: { type: Number, required: true },
    total_amount: { type: Number, default: 0 },
    total_max_amount: { type: Number, required: true },
    total_payments: { type: Number, default: 0 },
    total_max_payments: { type: Number, required: true },
    enabled: { type: Boolean, required: true },
}