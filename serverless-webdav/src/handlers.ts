import { FileRecord, getFileByPath, listDirectory, createFile, updateFile, deleteFile, moveFile, copyFile } from './db';
import { escapeXml, normalizePath } from './utils';

// Helper for PROPFIND
function generatePropfindXML(files: FileRecord[], baseUrl: string): string {
	const items = files
		.map((file) => {
			const href = baseUrl + encodeURI(file.path);
			const isDir = file.is_directory === 1;
			const displayName = file.name || '/';

			return `
     <D:response>
       <D:href>${href}</D:href>
       <D:propstat>
         <D:prop>
           <D:displayname>${escapeXml(displayName)}</D:displayname>
           <D:getcontentlength>${isDir ? 0 : file.size}</D:getcontentlength>
           <D:getcontenttype>${escapeXml(file.mime_type)}</D:getcontenttype>
           <D:getetag>${escapeXml(file.etag)}</D:getetag>
           <D:getlastmodified>${new Date(file.modified_at).toUTCString()}</D:getlastmodified>
           <D:creationdate>${new Date(file.created_at).toISOString()}</D:creationdate>
           <D:resourcetype>${isDir ? '<D:collection/>' : ''}</D:resourcetype>
         </D:prop>
         <D:status>HTTP/1.1 200 OK</D:status>
       </D:propstat>
     </D:response>`;
		})
		.join('');

	return `<?xml version="1.0" encoding="utf-8"?>
 <D:multistatus xmlns:D="DAV:">
 ${items}
 </D:multistatus>`;
}

export async function handleOptions(): Promise<Response> {
	return new Response(null, {
		status: 200,
		headers: {
			DAV: '1, 2',
			Allow: 'OPTIONS, GET, HEAD, PUT, DELETE, PROPFIND, MKCOL, MOVE, COPY',
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'OPTIONS, GET, HEAD, PUT, DELETE, PROPFIND, MKCOL, MOVE, COPY',
			'Access-Control-Allow-Headers': 'Authorization, Content-Type, Depth, Destination, Overwrite',
		},
	});
}

export async function handlePropfind(request: Request, db: D1Database, path: string): Promise<Response> {
	const file = await getFileByPath(db, path);
	if (!file) {
		return new Response('Not Found', { status: 404 });
	}

	const depth = request.headers.get('Depth') || '1';
	const files: FileRecord[] = [file];
	const url = new URL(request.url);

	if (depth !== '0' && file.is_directory) {
		const children = await listDirectory(db, file.id);
		files.push(...children);
	}

	const xml = generatePropfindXML(files, url.origin);
	return new Response(xml, {
		status: 207,
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			DAV: '1, 2',
		},
	});
}

export async function handleGet(request: Request, db: D1Database, path: string): Promise<Response> {
	const file = await getFileByPath(db, path);
	if (!file) {
		return new Response('Not Found', { status: 404 });
	}

	if (file.is_directory) {
		const children = await listDirectory(db, file.id);

		// Check for JSON request
		const accept = request.headers.get('Accept') || '';
		if (accept.includes('application/json')) {
			const json = children.map((child) => ({
				name: child.name,
				path: child.path,
				is_directory: child.is_directory === 1,
				size: child.size,
				mime_type: child.mime_type,
				modified_at: child.modified_at,
				created_at: child.created_at,
			}));
			return new Response(JSON.stringify(json), {
				headers: {
					'Content-Type': 'application/json; charset=utf-8',
				},
			});
		}

		const rows = children
			.map((child) => {
				const name = child.is_directory ? child.name + '/' : child.name;
				const href = encodeURI(child.name + (child.is_directory ? '/' : ''));
				const size = child.is_directory ? '-' : child.size;
				const date = new Date(child.modified_at).toLocaleString();
				return `<tr><td><a href="${href}">${name}</a></td><td>${size}</td><td>${date}</td></tr>`;
			})
			.join('');

		const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Index of ${path}</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 20px; }
              table { border-collapse: collapse; width: 100%; max-width: 800px; }
              th, td { text-align: left; padding: 8px; border-bottom: 1px solid #ddd; }
              th { border-bottom: 2px solid #ddd; }
            </style>
          </head>
          <body>
            <h1>Index of ${path}</h1>
            <table>
              <thead><tr><th>Name</th><th>Size</th><th>Last Modified</th></tr></thead>
              <tbody>
                ${path !== '/' ? '<tr><td><a href="..">../</a></td><td>-</td><td>-</td></tr>' : ''}
                ${rows}
              </tbody>
            </table>
          </body>
          </html>`;

		return new Response(html, {
			headers: {
				'Content-Type': 'text/html; charset=utf-8',
			},
		});
	}

	// D1 may return BLOBs as number[] (JSON array), so we explicitly convert to Uint8Array
	const body = file.content ? new Uint8Array(file.content as unknown as ArrayLike<number>) : null;

	return new Response(body, {
		headers: {
			'Content-Type': file.mime_type,
			'Content-Length': file.size.toString(),
			ETag: file.etag,
			'Last-Modified': new Date(file.modified_at).toUTCString(),
		},
	});
}

export async function handleHead(request: Request, db: D1Database, path: string): Promise<Response> {
	const file = await getFileByPath(db, path);
	if (!file) {
		return new Response(null, { status: 404 });
	}

	return new Response(null, {
		headers: {
			'Content-Type': file.mime_type,
			'Content-Length': file.size.toString(),
			ETag: file.etag,
			'Last-Modified': new Date(file.modified_at).toUTCString(),
		},
	});
}

export async function handlePut(request: Request, db: D1Database, path: string): Promise<Response> {
	const content = await request.arrayBuffer();
	const existing = await getFileByPath(db, path);

	if (existing) {
		if (existing.is_directory) {
			return new Response('Cannot PUT to a directory', { status: 405 });
		}
		await updateFile(db, path, content);
		return new Response(null, { status: 204 });
	} else {
		await createFile(db, path, false, content);
		return new Response(null, { status: 201 });
	}
}

export async function handleMkcol(request: Request, db: D1Database, path: string): Promise<Response> {
	const existing = await getFileByPath(db, path);
	if (existing) {
		return new Response('Already exists', { status: 405 });
	}

	await createFile(db, path, true);
	return new Response(null, { status: 201 });
}

export async function handleDelete(request: Request, db: D1Database, path: string): Promise<Response> {
	const file = await getFileByPath(db, path);
	if (!file) {
		return new Response('Not Found', { status: 404 });
	}

	await deleteFile(db, path);
	return new Response(null, { status: 204 });
}

export async function handleMove(request: Request, db: D1Database, path: string): Promise<Response> {
	const destination = request.headers.get('Destination');
	if (!destination) {
		return new Response('Destination header required', { status: 400 });
	}
	const overwrite = request.headers.get('Overwrite') !== 'F';

	const destUrl = new URL(destination, request.url);
	const destPath = normalizePath(destUrl.pathname);

	const existingDest = await getFileByPath(db, destPath);
	if (existingDest && !overwrite) {
		return new Response('Precondition Failed', { status: 412 });
	}

	await moveFile(db, path, destPath);
	return new Response(null, { status: existingDest ? 204 : 201 });
}

export async function handleCopy(request: Request, db: D1Database, path: string): Promise<Response> {
	const destination = request.headers.get('Destination');
	if (!destination) {
		return new Response('Destination header required', { status: 400 });
	}
	const overwrite = request.headers.get('Overwrite') !== 'F';

	const destUrl = new URL(destination, request.url);
	const destPath = normalizePath(destUrl.pathname);

	const existingDest = await getFileByPath(db, destPath);
	if (existingDest && !overwrite) {
		return new Response('Precondition Failed', { status: 412 });
	}

	await copyFile(db, path, destPath);
	return new Response(null, { status: existingDest ? 204 : 201 });
}
