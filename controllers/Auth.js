const { HttpController } = require('dc-api-core');
const config = require('dc-api-core/config');
const session = require('dc-api-core/session');
const db = require('dc-api-mongo').connect();

const { view, validateAuth, redirect } = require('../utils/mvc');

class Auth extends HttpController {
	async onLoad() {
		if(await validateAuth(this)) return this.redirect('/drops/index');
	}

	async login () {
		if(this.data) {
			if(!this.data.login) return view('auth/login', { error: 'Заполните все поля' }, this);
			if(!this.data.password && !config.allow_token_access) return view('auth/login', { error: 'Авторизация без пароля запрещена' }, this);
			
			if(!this.data.password && config.allow_token_access && this.data.login !== config.user.login) {
				const token = await db.Token.findOne({ token: this.data.login, enabled: true }).lean();
				if(!token) return view('auth/login', { error: 'Неверный токен' }, this);
				
				this.header('Set-Cookie', `token=${this.data.login}; Path=/`);
				return redirect(this, '/drops/index');
			} else {
				if(this.data.login !== config.user.login) return view('auth/login', { error: 'Неверный логин' }, this);
				if(this.data.password !== config.user.password) return view('auth/login', { error: 'Неверный пароль' }, this);
			}

			this.header('Set-Cookie', `login=${this.data.login}; Path=/`);

			return redirect(this, '/auth/set-password?password=' + this.data.password);
		} else return view('auth/login', { token_access: config.allow_token_access }, this);
	}

	async setPassword() {
		if(!this.query.password) return 'no_pass';

		this.header('Set-Cookie', `password=${this.query.password}; Path=/`);

		return redirect(this, '/drops/index');
	}
}

module.exports = Auth;
