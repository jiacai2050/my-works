export function normalizePath(path: string): string {
	path = decodeURIComponent(path);
	if (!path.startsWith('/')) path = '/' + path;
	path = path.replace(/\/+/g, '/');
	if (path !== '/' && path.endsWith('/')) {
		path = path.slice(0, -1);
	}
	return path;
}

export function escapeXml(unsafe: string): string {
	return unsafe.replace(/[<>&"']/g, (c) => {
		switch (c) {
			case '<':
				return '&lt;';
			case '>':
				return '&gt;';
			case '&':
				return '&amp;';
			case '"':
				return '&quot;';
			case "'":
				return '&apos;';
			default:
				return c;
		}
	});
}

export function checkAuth(request: Request, admin_user?: string | null, admin_pass?: string | null): boolean {
	if (!admin_user || !admin_pass) return true;

	const authHeader = request.headers.get('Authorization');
	if (!authHeader?.startsWith('Basic ')) return false;

	try {
		const credentials = atob(authHeader.slice(6));
		const [user, pass] = credentials.split(':');
		return user === admin_user && pass === admin_pass;
	} catch (e) {
		return false;
	}
}
