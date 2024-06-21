const { HttpController } = require('dc-api-core');
const config = require('dc-api-core/config');
const db = require('dc-api-mongo').connect();

const { view, decodeData, validateAuth } = require('../utils/mvc');

class Tokens extends HttpController {
    async onLoad() {
        if(!await validateAuth(this)) return this.redirect('/auth/login');
    }
    
    async index () {
        const tokens = await db.Token.find().sort({ _id: -1 }).lean();

        return view('panel/tokens/index', { tokens }, this);
    }

    async create() {
        if(this.data) {
            this.data.enabled = this.data.enabled === 'on';
            this.data.token = Math.random().toString().replace('.', '');
            await db.Token.create(this.data);

            return this.redirect('/tokens/index');
        } else return view('panel/tokens/create', {}, this);
    }

    async edit() {
        if(!this.query.id) return 'No id';

        const token = await db.Token.findById(this.query.id).lean();
        if(!token) return 'Not found';

        if(this.data) {
            this.data = decodeData(this.data);
            delete this.data._id;
            this.data.enabled = this.data.enabled === 'on';
            
            await db.Token.updateOne({ _id: token._id }, this.data);

            return this.redirect('/tokens/edit?id=' + this.query.id);
        } else return view('panel/tokens/edit', { token }, this);
    }
}

module.exports = Tokens;