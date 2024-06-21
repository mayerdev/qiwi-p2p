const { HttpController } = require('dc-api-core');
const config = require('dc-api-core/config');
const db = require('dc-api-mongo').connect();

const { view, validateAuth } = require('../utils/mvc');

class Panel extends HttpController {
    async onLoad() {
        if(!await validateAuth(this)) return this.redirect('/auth/login');
    }
}

module.exports = Panel;
