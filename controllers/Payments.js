const { HttpController } = require('dc-api-core');
const config = require('dc-api-core/config');
const { ObjectId } = require('mongodb');
const db = require('dc-api-mongo').connect();

const { view, validateAuth } = require('../utils/mvc');

class Payments extends HttpController {
    async onLoad() {
        if(!await validateAuth(this)) return this.redirect('/auth/login');
    }

    async resend() {
        if(!this.query.id) return this.send('No id', 403);

        const payment = await db.Payment.findById(this.query.id).lean();
        if(!payment) return this.send('NoPayment', 404);

        const drop = await db.Drop.findById(payment.drop_id).lean();
        if(!drop) return this.send('NoPayment', 404);

        const token = await db.Token.findById(payment.token_id).lean();
        if(!token) return this.send('NoPayment', 404);

        if(this.is_token) {
            if(!token._id.equals(this.is_token)) return this.send('NoAccess', 404);
        }

        await db.Payment.updateOne({ _id: payment._id }, { callback_sent: false });
        await db.Callback.deleteMany({ payment_id: payment._id });

        return this.redirect('/payments/view?id=' + this.query.id);
    }

    async index () {
        let payload = [
            {
                $lookup: {
                  from: 'tokens',
                  localField: 'token_id',
                  foreignField: '_id',
                  as: 'token'
                }
            },
            {
                $unwind: {
                  path: '$token',
                  preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                  from: 'drops',
                  localField: 'drop_id',
                  foreignField: '_id',
                  as: 'drop'
                }
            },
            {
                $unwind: {
                  path: '$drop',
                  preserveNullAndEmptyArrays: true
                }
            },
            { $sort: { _id: -1 } }
        ];

        if(!!this.is_token) payload.splice(0, 0, { $match: { token_id: new ObjectId(this.is_token) } });

        const payments = await db.Payment.aggregate(payload);

        return view('panel/payments/index', {
            payments,
            status: {
                pending: 'Ожидает оплаты',
                processing: 'В процессе оплаты',
                paid: 'Оплачен',
                failed: 'Ошибка оплаты'
            },
            status_type: {
                pending: 'default',
                processing: 'primary',
                paid: 'success',
                failed: 'danger'
            },
            is_token: !!this.is_token
        }, this);
    }

    async view() {
        if(!this.query.id) return this.send('NoId', 400);

        const payment = await db.Payment.findById(this.query.id).lean();
        if(!payment) return this.send('NoPayment', 404);

        const drop = await db.Drop.findById(payment.drop_id).lean();
        if(!drop) return this.send('NoPayment', 404);

        const token = await db.Token.findById(payment.token_id).lean();
        if(!token) return this.send('NoPayment', 404);

        if(this.is_token) {
            if(!token._id.equals(this.is_token)) return this.send('NoAccess', 404);
        }

        const callbacks = await db.Callback.find({ payment_id: payment._id }).lean();

        return view('panel/payments/view', {
            payment,
            drop,
            token,
            callbacks,
            status: {
                pending: 'Ожидает оплаты',
                processing: 'В процессе оплаты',
                paid: 'Оплачен',
                failed: 'Ошибка оплаты'
            },
            status_type: {
                pending: 'default',
                processing: 'primary',
                paid: 'success',
                failed: 'danger'
            },
            is_token: !!this.is_token
        }, this);
    }
}

module.exports = Payments;