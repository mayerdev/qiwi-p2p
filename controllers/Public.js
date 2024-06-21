const { HttpController } = require('dc-api-core');
const { ObjectId } = require('mongodb');
const config = require('dc-api-core/config');
const log = require('dc-api-core/log');
const db = require('dc-api-mongo').connect();
const HttpsProxyAgent = require('https-proxy-agent');
const axios = require('axios');

const { view, redirect} = require('../utils/mvc');

function getPayDate() {
    const now = new Date();
    now.setHours(now.getHours() + 24);

    const month = now.getMonth() + 1;
    const time = new Date().toLocaleTimeString('ru-RU').split(':');
    const _time = `${time[0]}${time[1]}`;
    const day = now.getDate();

    return `${now.getFullYear()}-${month < 10 ? ('0' + month) : month}-${day < 10 ? ('0' + day) : day}T${_time}`;
}

class Public extends HttpController {
    async pay() {
        if(this.data) return this.send('Method not allowed', 403);
        if(!this.query.id) return this.send('No ID', 400);
        if(!ObjectId.isValid(this.query.id)) return this.send('Invalid ID', 400);

        
        const payment = await db.Payment.findById(this.query.id).lean();
        if(!payment) return this.send('Payment not exists', 404);

        const token = await db.Token.findById(payment.token_id).lean();
        if(!token) return this.send('Token not found', 404);

        const drop = await db.Drop.findById(payment.drop_id).lean();
        if(!drop) return this.send('Merchant not found', 404);

        let httpsAgent = null;

        const proxy = await db.Proxy.findOne({ drop_id: drop._id }).lean();
        if(proxy) httpsAgent = new HttpsProxyAgent({
            host: proxy.ip,
            port: proxy.port,
            auth: `${proxy.username}:${proxy.password}`
        });

        log.info(httpsAgent ? proxy.ip : 'Прокси не используется');

        const successUrl = `${config.base_url}/public/pay?id=${payment._id}`;

        const amount = payment.amount.toFixed(2);

        if(payment.status === 'pending') {
            let redirect = `https://oplata.qiwi.com/create?publicKey=${drop.p2p_public}&billId=${payment._id}&amount=${amount}&customFields[paySourcesFilter]=${payment.method}&lifetime=${getPayDate()}&successUrl=${encodeURIComponent(successUrl)}`;
            await db.Payment.updateOne({ _id: payment._id }, { pay_link: redirect, status: 'processing' });

            return view('public/pay', { redirect }, this);
        } else if(payment.status === 'processing') {
            try {
                let payload = {
                    url: `https://api.qiwi.com/partner/bill/v1/bills/${payment._id}`,
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${drop.p2p_secret}`,
                        Accept: 'application/json'
                    },
                };

                if(httpsAgent) payload['httpsAgent'] = httpsAgent;

                const res = await axios(payload);

                if(!res || !res.data) return view('public/pay', { redirect: payment.pay_link }, this);

                const data = res.data;

                if(data.amount.currency !== 'RUB') return this.send('Currency not RUB', 403);
                if(data.amount.value !== amount) return this.send('Amount incorrect', 403);

                if(data.status.value === 'WAITING') return view('public/pay', { redirect: payment.pay_link }, this);
                else if(data.status.value === 'PAID') {
                    await db.Payment.updateOne({ _id: payment._id }, { status: 'paid' });
                    await db.Drop.updateOne({ _id: drop._id }, {
                        total_amount: Number(drop.total_amount + payment.amount).toFixed(2),
                        total_payments: drop.total_payments + 1
                    });

                    if((drop.total_amount + payment.amount) >= drop.total_max_amount) await db.Drop.updateOne({ _id: drop._id }, { enabled: false });
                    if((drop.total_payments + 1) >= drop.total_max_payments) await db.Drop.updateOne({ _id: drop._id }, { enabled: false });

                    return view('public/pay', { redirect: payment.success_url }, this);
                } else if(data.status.value === 'REJECTED') {
                    await db.Payment.updateOne({ _id: payment._id }, { status: 'failed', error: 'REJECTED' });

                    return view('public/pay', { redirect: payment.fail_url }, this);
                } else if(data.status.value === 'EXPIRED') {
                    await db.Payment.updateOne({ _id: payment._id }, { status: 'failed', error: 'EXPIRED' });

                    return view('public/pay', { redirect: payment.fail_url }, this);
                } else return this.drop()
            } catch(err) {
                console.log(err);
                if(!payment.pay_link) return this.send('Failed to get invoice status', 400);

                return view('public/pay', { redirect: payment.pay_link }, this);
            }
        } else if(payment.status === 'paid') {
            return view('public/pay', { redirect: payment.success_url }, this);
        } else if(payment.status === 'failed') {
            return view('public/pay', { redirect: payment.fail_url }, this);
        }
    }
}

module.exports = Public;