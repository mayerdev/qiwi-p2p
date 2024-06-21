const db = require('dc-api-mongo').connect();
const log = require('dc-api-core/log');
const axios = require('axios');
const { onError } = require('dc-api-core/errors');

onError(console.log);

const sleep = delay => new Promise(resolve => setTimeout(resolve, delay));

async function send() {
    log.info('Начинаем отправлять колбеки');

    const payments = await db.Payment.find({ callback_sent: false, status: 'paid' }).lean();

    for(let payment of payments) {
        const token = await db.Token.findById(payment.token_id).lean();
        if(!token) {
            log.error(`${payment._id}, токен не найден`);
            continue
        }

        const attempts = await db.Callback.countDocuments({ payment_id: payment._id });
        if(attempts > 5) {
            await db.Payment.updateOne({ _id: payment._id }, { callback_sent: true });
            log.error(`${payment._id}, слишком много попыток отправки уведомления`);
            break;
        }

        try {
            const res = await axios({
                url: token.callback_url,
                method: 'post',
                data: {
                    token: token.token,
                    payment_id: payment._id,
                    amount: payment.amount
                }
            });

            if(!res || !res.data) {
                await db.Callback.create({
                    payment_id: payment._id,
                    callback_url: token.callback_url,
                    code: res.status || 0,
                    body: 'EMPTY'
                });

                log.error(`${payment._id}, уведомление отправлено с ошибкой #1`);
                continue;
            }
            
            await db.Callback.create({
                payment_id: payment._id,
                callback_url: token.callback_url,
                code: res.status || 200,
                body: JSON.stringify(res.data)
            });

            await db.Payment.updateOne({ _id: payment._id }, { callback_sent: true });
            log.success(`${payment._id}, уведомление доставлено`);
        } catch(err) {
            await db.Callback.create({
                payment_id: payment._id,
                callback_url: token.callback_url,
                code: (err.response || { status: 0 }).status || 0,
                body: JSON.stringify((err.response || { data: err.code }).data)
            });

            log.error(`${payment._id}, уведомление отправлено с ошибкой #2`);
            continue;
        }
    }
}

async function main() {
    while(true) {
        await send();
        await sleep(5000);
    }
}

main();