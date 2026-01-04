export interface FileRecord {
	id: number;
	name: string;
	parent_id: number | null;
	path: string;
	is_directory: number;
	content: ArrayBuffer | null;
	size: number;
	mime_type: string;
	etag: string;
	created_at: string;
	modified_at: string;
}

export const SCHEMA = `
 CREATE TABLE IF NOT EXISTS files (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     name TEXT NOT NULL,
     parent_id INTEGER,
     path TEXT NOT NULL UNIQUE,
     is_directory BOOLEAN NOT NULL DEFAULT 0,
     content BLOB,
     size INTEGER DEFAULT 0,
     mime_type TEXT DEFAULT 'application/octet-stream',
     etag TEXT,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (parent_id) REFERENCES files(id) ON DELETE CASCADE,
     CHECK (is_directory IN (0, 1))
 );

 CREATE UNIQUE INDEX IF NOT EXISTS idx_path ON files(path);
 CREATE INDEX IF NOT EXISTS idx_parent_id ON files(parent_id);
 CREATE UNIQUE INDEX IF NOT EXISTS idx_name_parent ON files(name, parent_id);

 -- Insert root directory (if not exists)
 INSERT OR IGNORE INTO files (id, name, parent_id, path, is_directory, etag)
 VALUES (1, '', NULL, '/', 1, '"root"');
 `;

let dbInitialized = false;

export async function initDatabase(db: D1Database) {
	if (dbInitialized) return;
	const statements = SCHEMA.split(';').filter((s) => s.trim());
	for (const statement of statements) {
		if (statement.trim()) {
			await db.prepare(statement).run();
		}
	}
	dbInitialized = true;
}

// Helper functions
function generateETag(): string {
	return `"${Math.random().toString(36).substring(2)}-${Date.now()}"`;
}

function getParentPath(path: string): string {
	if (path === '/') return '/';
	const parts = path.split('/').filter((p) => p);
	parts.pop();
	return '/' + parts.join('/');
}

function getFileName(path: string): string {
	const parts = path.split('/').filter((p) => p);
	return parts[parts.length - 1] || '';
}

function guessMimeType(filename: string): string {
	const ext = filename.split('.').pop()?.toLowerCase();
	const mimeTypes: Record<string, string> = {
		txt: 'text/plain',
		html: 'text/html',
		css: 'text/css',
		js: 'application/javascript',
		json: 'application/json',
		png: 'image/png',
		jpg: 'image/jpeg',
		jpeg: 'image/jpeg',
		gif: 'image/gif',
		svg: 'image/svg+xml',
		pdf: 'application/pdf',
		zip: 'application/zip',
		mp4: 'video/mp4',
		mp3: 'audio/mpeg',
	};
	return mimeTypes[ext || ''] || 'application/octet-stream';
}

// Database operations

export async function getFileByPath(db: D1Database, path: string): Promise<FileRecord | null> {
	const result = await db.prepare('SELECT * FROM files WHERE path = ?').bind(path).first<FileRecord>();
	return result;
}

export async function listDirectory(db: D1Database, parentId: number): Promise<FileRecord[]> {
	const result = await db
		.prepare('SELECT * FROM files WHERE parent_id = ? ORDER BY is_directory DESC, name ASC')
		.bind(parentId)
		.all<FileRecord>();
	return result.results || [];
}

export async function createFile(db: D1Database, path: string, isDirectory: boolean, content?: ArrayBuffer): Promise<FileRecord> {
	const parentPath = getParentPath(path);
	const name = getFileName(path);
	const mimeType = isDirectory ? 'httpd/unix-directory' : guessMimeType(name);
	const size = content?.byteLength || 0;
	const etag = generateETag();

	// Find parent directory
	const parent = await getFileByPath(db, parentPath);
	if (!parent) {
		throw new Error(`Parent directory not found: ${parentPath}`);
	}
	if (!parent.is_directory) {
		throw new Error(`Parent is not a directory: ${parentPath}`);
	}

	// Insert file
	const result = await db
		.prepare(
			`INSERT INTO files (name, parent_id, path, is_directory, content, size, mime_type, etag)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *`,
		)
		.bind(name, parent.id, path, isDirectory ? 1 : 0, content || null, size, mimeType, etag)
		.first<FileRecord>();

	return result!;
}

export async function updateFile(db: D1Database, path: string, content: ArrayBuffer): Promise<FileRecord> {
	const size = content.byteLength;
	const etag = generateETag();

	const result = await db
		.prepare(
			`UPDATE files
      SET content = ?, size = ?, etag = ?, modified_at = CURRENT_TIMESTAMP
      WHERE path = ?
      RETURNING *`,
		)
		.bind(content, size, etag, path)
		.first<FileRecord>();

	if (!result) {
		throw new Error('File not found');
	}

	return result;
}

export async function deleteFile(db: D1Database, path: string): Promise<void> {
	const file = await getFileByPath(db, path);
	if (!file) return;

	// Relies on ON DELETE CASCADE defined in schema to remove children
	await db.prepare('DELETE FROM files WHERE id = ?').bind(file.id).run();
}

export async function moveFile(db: D1Database, oldPath: string, newPath: string): Promise<void> {
	const file = await getFileByPath(db, oldPath);
	if (!file) {
		throw new Error('Source not found');
	}

	const newParentPath = getParentPath(newPath);
	const newName = getFileName(newPath);

	const newParent = await getFileByPath(db, newParentPath);
	if (!newParent) {
		throw new Error('Destination parent not found');
	}

	const statements: any[] = [];

	// Check destination and overwrite if exists (Atomic delete)
	// Relies on ON DELETE CASCADE
	const existing = await getFileByPath(db, newPath);
	if (existing) {
		statements.push(db.prepare('DELETE FROM files WHERE id = ?').bind(existing.id));
	}

	// Update paths for children if it is a directory
	if (file.is_directory) {
		const children = await db
			.prepare(
				`WITH RECURSIVE subtree AS (
					SELECT * FROM files WHERE parent_id = ?
					UNION ALL
					SELECT f.* FROM files f
					JOIN subtree s ON f.parent_id = s.id
				)
				SELECT * FROM subtree`,
			)
			.bind(file.id)
			.all<FileRecord>();

		for (const child of children.results || []) {
			const suffix = child.path.substring(oldPath.length);
			const newChildPath = newPath + suffix;
			statements.push(db.prepare('UPDATE files SET path = ? WHERE id = ?').bind(newChildPath, child.id));
		}
	}

	statements.push(
		db
			.prepare(
				`UPDATE files
      SET name = ?, parent_id = ?, path = ?, modified_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
			)
			.bind(newName, newParent.id, newPath, file.id),
	);

	await db.batch(statements);
}

export async function copyFile(db: D1Database, oldPath: string, newPath: string): Promise<void> {
	const file = await getFileByPath(db, oldPath);
	if (!file) {
		throw new Error('Source not found');
	}

	if (file.is_directory) {
		throw new Error(`Copying directories is not supported: ${oldPath}`);
	}

	const existingDest = await getFileByPath(db, newPath);
	if (existingDest && existingDest.is_directory) {
		throw new Error(`Cannot overwrite directory '${newPath}' with file '${oldPath}'`);
	}

	const newParentPath = getParentPath(newPath);
	const destParent = await getFileByPath(db, newParentPath);
	if (!destParent) {
		throw new Error('Destination parent not found');
	}

	const targetName = getFileName(newPath);
	const etag = generateETag();

	const statements: any[] = [];

	// Atomic delete of destination if exists
	if (existingDest) {
		statements.push(db.prepare('DELETE FROM files WHERE id = ?').bind(existingDest.id));
	}

	// Insert the copy
	statements.push(
		db
			.prepare(
				`INSERT INTO files (name, parent_id, path, is_directory, content, size, mime_type, etag)
         VALUES (?, ?, ?, 0, ?, ?, ?, ?)`,
			)
			.bind(targetName, destParent.id, newPath, file.content, file.size, file.mime_type, etag),
	);

	await db.batch(statements);
}
