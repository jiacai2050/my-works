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

function escapeLike(path: string): string {
	return path.replace(/[\\%_]/g, '\\$&');
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
	// Atomic delete of file and all children (if it's a directory)
	// This does not rely on foreign keys being enabled.
	await db
		.prepare("DELETE FROM files WHERE path = ? OR path LIKE ? ESCAPE '\\'")
		.bind(path, `${escapeLike(path)}/%`)
		.run();
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

	const statements: D1PreparedStatement[] = [];

	// Check destination and overwrite if exists (Atomic delete)
	// We use the same logic as deleteFile to ensure children are gone too.
	statements.push(db.prepare("DELETE FROM files WHERE path = ? OR path LIKE ? ESCAPE '\\'").bind(newPath, `${escapeLike(newPath)}/%`));

	// Update paths for children if it is a directory
	if (file.is_directory) {
		const children = await db
			.prepare("SELECT * FROM files WHERE path LIKE ? ESCAPE '\\'")
			.bind(`${escapeLike(oldPath)}/%`)
			.all<FileRecord>();

		for (const child of children.results || []) {
			const newChildPath = child.path.replace(oldPath, newPath);
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
	// 1. Get all source files (ordered by path length to ensure parents come before children)
	const sourceFiles = await db
		.prepare("SELECT * FROM files WHERE path = ? OR path LIKE ? ESCAPE '\\' ORDER BY length(path) ASC")
		.bind(oldPath, `${escapeLike(oldPath)}/%`)
		.all<FileRecord>();

	if (!sourceFiles.results || sourceFiles.results.length === 0) {
		throw new Error('Source not found');
	}

	// 2. Handle Overwrite (Atomic delete of destination if exists)
	await db
		.prepare("DELETE FROM files WHERE path = ? OR path LIKE ? ESCAPE '\\'")
		.bind(newPath, `${escapeLike(newPath)}/%`)
		.run();

	// 3. Prepare for level-by-level insertion
	const newParentPath = getParentPath(newPath);
	const destParent = await getFileByPath(db, newParentPath);
	if (!destParent) {
		throw new Error('Destination parent not found');
	}

	const idMap = new Map<number, number>();
	const filesByDepth = new Map<number, FileRecord[]>();

	// Group files by depth
	for (const file of sourceFiles.results) {
		const depth = file.path.split('/').length;
		if (!filesByDepth.has(depth)) {
			filesByDepth.set(depth, []);
		}
		filesByDepth.get(depth)!.push(file);
	}

	// Sort depths to process parents before children
	const sortedDepths = Array.from(filesByDepth.keys()).sort((a, b) => a - b);

	for (const depth of sortedDepths) {
		const files = filesByDepth.get(depth)!;
		
		// Process in chunks to avoid hitting D1 batch limits (e.g. 100 statements)
		const CHUNK_SIZE = 50;
		for (let i = 0; i < files.length; i += CHUNK_SIZE) {
			const chunk = files.slice(i, i + CHUNK_SIZE);
			const statements: any[] = [];
			const chunkFileIds: number[] = [];

			for (const file of chunk) {
				const suffix = file.path.substring(oldPath.length);
				const targetPath = newPath + suffix;
				const targetName = getFileName(targetPath);
				
				const isDirectory = file.is_directory;
				const content = file.content;
				const size = file.size;
				const mimeType = file.mime_type;
				const etag = generateETag();

				let parentId: number;

				if (targetPath === newPath) {
					// Root of the copy
					parentId = destParent.id;
				} else {
					// Child: parent must have been processed in previous levels
					// because we sorted by depth
					const mappedParentId = idMap.get(file.parent_id!);
					if (mappedParentId === undefined) {
						throw new Error(`Parent ID not found for file: ${file.path}`);
					}
					parentId = mappedParentId;
				}

				statements.push(
					db
						.prepare(
							`INSERT INTO files (name, parent_id, path, is_directory, content, size, mime_type, etag)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)
               RETURNING id`,
						)
						.bind(targetName, parentId, targetPath, isDirectory, content, size, mimeType, etag),
				);
				chunkFileIds.push(file.id);
			}

			if (statements.length > 0) {
				const results = await db.batch<FileRecord>(statements);
				for (let j = 0; j < results.length; j++) {
					const newId = results[j].results?.[0]?.id;
					if (newId) {
						idMap.set(chunkFileIds[j], newId);
					}
				}
			}
		}
	}
}
