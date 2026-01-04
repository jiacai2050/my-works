import { initDatabase } from './db';
import * as handlers from './handlers';
import { checkAuth, normalizePath } from './utils';

interface SecretStore {
	get(): Promise<string | null>;
}

interface Env {
	DB: D1Database;
	AUTH_USER?: SecretStore | string;
	AUTH_PASS?: SecretStore | string;
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		// 初始化数据库，只需执行一次
		// await initDatabase(env.DB);

		// 认证检查
		const admin_user = await env.AUTH_USER.get();
		const admin_pass = await env.AUTH_PASS.get();
		if (!checkAuth(request, admin_user, admin_pass)) {
			return new Response('Unauthorized', {
				status: 401,
				headers: { 'WWW-Authenticate': 'Basic realm="WebDAV"' },
			});
		}

		const url = new URL(request.url);
		const path = normalizePath(url.pathname);
		const method = request.method;

		try {
			switch (method) {
				case 'OPTIONS':
					return await handlers.handleOptions();
				case 'PROPFIND':
					return await handlers.handlePropfind(request, env.DB, path);
				case 'GET':
					return await handlers.handleGet(request, env.DB, path);
				case 'HEAD':
					return await handlers.handleHead(request, env.DB, path);
				case 'PUT':
					return await handlers.handlePut(request, env.DB, path);
				case 'MKCOL':
					return await handlers.handleMkcol(request, env.DB, path);
				case 'DELETE':
					return await handlers.handleDelete(request, env.DB, path);
				case 'MOVE':
					return await handlers.handleMove(request, env.DB, path);
				case 'COPY':
					return await handlers.handleCopy(request, env.DB, path);
				default:
					return new Response('Method not allowed', { status: 405 });
			}
		} catch (error) {
			console.error('Error:', error);
			return new Response(error instanceof Error ? error.message : 'Internal Server Error', { status: 500 });
		}
	},
} satisfies ExportedHandler<Env>;
