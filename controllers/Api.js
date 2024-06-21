const { HttpController } = require('dc-api-core');
const config = require('dc-api-core/config');
const db = require('dc-api-mongo').connect();

const METHODS = ['qw', 'card'];

class Api extends HttpController {
    async onLoad() {
        const auth = this.header('Authorization');

        if(!auth) this.drop();
        const token = auth.toLowerCase().replace('bearer ', '');

        const exists = await db.Token.findOne({ token, enabled: true }).lean();
        if(!exists) return this.send('TokenNotExists', 403);

        this.token = exists;
    }

    async payment() {
        if(!this.token || !this.token._id) return this.send('NoToken', 403);

        if(this.data) {
            console.log(this.data)
            if(!this.data.amount || !this.data.method || !this.data.success_url || !this.data.fail_url) return this.send('FillFields', 400);
            if(!METHODS.includes(this.data.method)) return this.send('UnknownMethod', 400);

            const drop = await db.Drop.findOne({
                min_amount: { $lte: this.data.amount },
                max_amount: { $gte: this.data.amount },
                enabled: true
            });
            if(!drop) return this.send('NotEnoughDrops', 400);

            const create = await db.Payment.create({
                token_id: this.token._id,
                drop_id: drop._id,
                amount: this.data.amount,
                method: this.data.method,
                success_url: this.data.success_url,
                fail_url: this.data.fail_url
            });

            if(!config.allow_noproxy_processing) {
                const proxy = await db.Proxy.findOne({ drop_id: drop._id }).lean();
                if(!proxy) return this.send('NoProxy', 400)
            }

            return {
                id: create._id,
                url: `${config.base_url}/public/pay?id=${create._id}`
            };
        } else {
            if(!this.query.id) return this.send('FillIdField', 400);

            const exists = await db.Payment.findById(this.query.id).lean();
            if(!exists) return this.send('NotExists', 400);

            return exists;
        }
    }
}

module.exports = Api;