import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import worker from '../src/index';

// Helper to create a request
function createRequest(method: string, path: string, headers: Record<string, string> = {}, body?: BodyInit | null) {
	return new Request(`http://example.com${path}`, {
		method,
		headers,
		body,
	});
}

describe('WebDAV Worker', () => {
	// We rely on the worker's initDatabase to set up the DB.
	// However, for isolation, we might want to clear tables between tests if the environment persists.
	// In @cloudflare/vitest-pool-workers, usually each test run might get a fresh isolated storage depending on config,
	// but explicit cleanup is safer if we want deterministic tests in the same run.

	// For now, let's assume we can just run a sequence of operations or use unique paths.
	// Or we can try to clear the DB.

	async function run(method: string, path: string, headers: Record<string, string> = {}, body?: BodyInit | null) {
		const req = createRequest(method, path, headers, body);
		const ctx = createExecutionContext();
		const res = await worker.fetch(req, env, ctx);
		await waitOnExecutionContext(ctx);
		return res;
	}

	it('OPTIONS returns correct headers', async () => {
		const res = await run('OPTIONS', '/');
		expect(res.status).toBe(200);
		expect(res.headers.get('DAV')).toBe('1, 2');
		expect(res.headers.get('Allow')).toContain('COPY');
	});

	it('MKCOL creates a directory', async () => {
		const res = await run('MKCOL', '/test-dir');
		expect(res.status).toBe(201);

		// Verify it exists via PROPFIND
		const propRes = await run('PROPFIND', '/test-dir', { Depth: '0' });
		expect(propRes.status).toBe(207);
		const text = await propRes.text();
		expect(text).toContain('<D:collection/>');
	});

	it('PUT creates a file', async () => {
		const content = 'Hello WebDAV';
		const res = await run('PUT', '/test.txt', {}, content);
		expect(res.status).toBe(201);

		// Verify content
		const getRes = await run('GET', '/test.txt');
		expect(getRes.status).toBe(200);
		expect(await getRes.text()).toBe(content);
	});

	it('PROPFIND lists directory contents', async () => {
		// Setup: Ensure root has children from previous tests or creating new ones
		await run('MKCOL', '/list-test');
		await run('PUT', '/list-test/file1.txt', {}, 'content');

		const res = await run('PROPFIND', '/list-test', { Depth: '1' });
		expect(res.status).toBe(207);
		const text = await res.text();
		expect(text).toContain('file1.txt');
		expect(text).toContain('list-test');
	});

	it('DELETE removes a file', async () => {
		await run('PUT', '/delete-me.txt', {}, 'bye');
		const res = await run('DELETE', '/delete-me.txt');
		expect(res.status).toBe(204);

		const check = await run('HEAD', '/delete-me.txt');
		expect(check.status).toBe(404);
	});

	it('MOVE renames a file', async () => {
		await run('PUT', '/move-src.txt', {}, 'move me');
		const res = await run('MOVE', '/move-src.txt', { Destination: 'http://example.com/move-dest.txt' });
		expect(res.status).toBe(204);

		const oldRes = await run('HEAD', '/move-src.txt');
		expect(oldRes.status).toBe(404);

		const newRes = await run('GET', '/move-dest.txt');
		expect(newRes.status).toBe(200);
		expect(await newRes.text()).toBe('move me');
	});

	it('COPY copies a file', async () => {
		const content = 'copy me';
		await run('PUT', '/copy-src.txt', {}, content);

		const res = await run('COPY', '/copy-src.txt', { Destination: 'http://example.com/copy-dest.txt' });
		expect(res.status).toBe(201);

		// Source should still exist
		const srcRes = await run('GET', '/copy-src.txt');
		expect(srcRes.status).toBe(200);

		// Destination should exist
		const destRes = await run('GET', '/copy-dest.txt');
		expect(destRes.status).toBe(200);
		expect(await destRes.text()).toBe(content);
	});

	it('COPY copies a directory recursively', async () => {
		await run('MKCOL', '/copy-dir-src');
		await run('PUT', '/copy-dir-src/child.txt', {}, 'child');

		const res = await run('COPY', '/copy-dir-src', { Destination: 'http://example.com/copy-dir-dest' });
		expect(res.status).toBe(201);

		// Check child in destination
		const childRes = await run('GET', '/copy-dir-dest/child.txt');
		expect(childRes.status).toBe(200);
		expect(await childRes.text()).toBe('child');
	});
});
