const { HttpController } = require('dc-api-core');
const config = require('dc-api-core/config');
const db = require('dc-api-mongo').connect();
const axios = require('axios');

const { view, decodeData, validateAuth } = require('../utils/mvc');

class Tokens extends HttpController {
    async onLoad() {
        if(!await validateAuth(this)) return this.redirect('/auth/login');
    }
    
    async access() {
        return view('panel/issue/access_token', {}, this);
    }

    async requestAccess() {
        if(!this.data || !this.data.cookie || !this.data.login || !this.data.token_head) return 'Fill fields';
        this.data = decodeData(this.data);

        try {
            const payload = {
                url: 'https://qiwi.com/oauth/authorize',
                method: 'post',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    cookie: this.data.cookie
                },
                data: {
                    response_type: 'code',
                    client_id: 'qiwi_wallet_api',
                    client_software: 'WEB v4.96.0',
                    username: this.data.login,
                    scope: 'read_person_profile read_balance read_payment_history accept_payments get_virtual_cards_requisites write_ip_whitelist',
                    token_head: this.data.token_head,
                    token_head_client_id: 'web-qw'
                }
            };

            const res = await axios(payload);
    
            return view('panel/issue/access_token', { result1: JSON.stringify(res.data) }, this);
        } catch(err) {
            return err.response.data;
        }
    }

    async sendAccess() {
        if(!this.data || !this.data.code || !this.data.cookie) return 'FillFields';

        try {
            const payload = {
                url: 'https://qiwi.com/oauth/token',
                method: 'post',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    cookie: this.data.cookie
                },
                data: {
                    grant_type: 'urn:qiwi:oauth:grant-type:vcode',
                    client_id: 'qiwi_wallet_api',
                    code: this.data._code,
                    vcode: this.data.code
                }
            };

            const res = await axios(payload);
    
            return view('panel/issue/access_token', { result2: JSON.stringify(res.data) }, this);
        } catch(err) {
            return err.response.data;
        }
    }

    async ptp() {
        return view('panel/issue/p2p', {}, this);
    }

    async requestPtp() {
        if(!this.data || !this.data.name || !this.data.token) return 'Fill fields';

        try {
            const payload = {
                url: 'https://edge.qiwi.com/widgets-api/api/p2p/protected/keys/create',
                method: 'post',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.data.token}`
                },
                data: {
                    keysPairName: this.data.name,
                    serverNotificationsUrl: this.data.callback || ''
                }
            };

            const res = await axios(payload);
    
            return view('panel/issue/p2p', { result: JSON.stringify(res.data) }, this);
        } catch(err) {
            return err.response.data;
        }
    }
}

module.exports = Tokens;