const { HttpController } = require('dc-api-core');
const config = require('dc-api-core/config');
const db = require('dc-api-mongo').connect();

const { view, validateAuth } = require('../utils/mvc');

class Drops extends HttpController {
    async onLoad() {
        if(!await validateAuth(this)) return this.redirect('/auth/login');
    }

    async index () {
        const drops = await db.Drop.find().sort({ _id: -1 }).lean();
        return view('panel/drops/index', { drops }, this);
    }

    async create() {
        if(this.data) {
            this.data.enabled = this.data.enabled === 'on';
            await db.Drop.create(this.data);

            return this.redirect('/drops/index');
        } else return view('panel/drops/create', {}, this);
    }

    async edit() {
        if(!this.query.id) return 'No id';

        const drop = await db.Drop.findById(this.query.id).lean();
        if(!drop) return 'Not found';

        if(this.data) {
            delete this.data._id;
            this.data.enabled = this.data.enabled === 'on';
            
            await db.Drop.updateOne({ _id: drop._id }, this.data);

            return this.redirect('/drops/index');
        } else return view('panel/drops/edit', { drop }, this);
    }
}

module.exports = Drops;