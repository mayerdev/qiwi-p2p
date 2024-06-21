const twig = require('twig');
const config = require('dc-api-core/config');
const db = require('dc-api-mongo').connect();

module.exports.parseCookie = cookie => {
    if(!cookie) return {};
    
    const cookies = cookie.split(';');

    let obj = {};

    for(let item of cookies) {
        const splitted = item.split('=');
        obj[splitted[0].trim()] = splitted[1].trim();
    }

    return obj;
}

module.exports.redirect = (ctx, redirect) => {
    ctx.header('Content-Type', 'text/html');
    ctx.send(`<script>window.location.href = '${redirect}';</script>`, 200, true);
}

const TOKEN_PATHS = ['/payments/index', '/payments/view', '/payments/resend'];

module.exports.validateAuth = async ctx => {
    const cookies = this.parseCookie(ctx.header('cookie'));

    if(!cookies) return false;

    if(cookies.token) {
        const token = await db.Token.findOne({ token: cookies.token, enabled: true });
        if(!token) return false;

        if(!TOKEN_PATHS.includes(ctx._req.path)) return ctx.redirect('/payments/index');

        ctx.is_token = token._id;

        return true;
    }
    if(!cookies.login || !cookies.password) return false;

    if(cookies.login !== config.user.login) return false;
    if(cookies.password !== config.user.password) return false;

    return true;
}

module.exports.decodeData = data => {
    let obj = {};

    for(let item of Object.entries(data)) {
        obj[item[0]] = item[1].replace(/\+/g, ' ');
    }

    return obj;
}

module.exports.view = (view, params = {}, ctx) => {
    ctx.header('Content-Type', 'text/html');

    twig.renderFile(`${__dirname}/../views/${view}.twig`, params, (err, html) => {
        if(!err) return ctx.send(html, 200, true);
        else return ctx.send(err, 500);
    });
}