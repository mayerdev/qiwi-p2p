const { HttpController } = require('dc-api-core');
const config = require('dc-api-core/config');
const db = require('dc-api-mongo').connect();

const { view, validateAuth } = require('../utils/mvc');

class Proxy extends HttpController {
    async onLoad() {
        if(!await validateAuth(this)) return this.redirect('/auth/login');
    }

    async index () {
        const proxys = await db.Proxy.aggregate([
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
            {
                $sort: { _id: -1 }
            }
        ]);

        return view('panel/proxy/index', { proxys }, this);
    }

    async create() {
        if(this.data) {
            const exists = await db.Proxy.findOne({ drop_id: this.data.drop_id }).lean();
            if(exists) return 'One drop - one proxy';

            await db.Proxy.create(this.data);

            return this.redirect('/proxy/index');
        } else {
            const drops = await db.Drop.find().sort({ _id: -1 }).lean();

            return view('panel/proxy/create', { drops }, this);
        }
    }

    async edit() {
        if(!this.query.id) return 'No id';

        const proxy = await db.Proxy.findById(this.query.id).lean();
        if(!proxy) return 'Not found';

        if(this.data) {
            delete this.data._id;
            
            await db.Proxy.updateOne({ _id: proxy._id }, this.data);

            return this.redirect('/proxy/index');
        } else {
            const drops = await db.Drop.find().sort({ _id: -1 }).lean();

            return view('panel/proxy/edit', { proxy, drops }, this);
        }
    }

    async remove() {
        if(!this.query.id) return 'No id';

        const proxy = await db.Proxy.findById(this.query.id).lean();
        if(!proxy) return 'Not found';

        await db.Proxy.deleteOne({ _id: proxy._id });

        return this.redirect('/proxy/index');
    }
}

module.exports = Proxy;