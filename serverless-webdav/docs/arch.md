# Database Architecture

This project uses **Cloudflare D1** (built on SQLite) to store both file metadata and content.

## Schema Overview

The database consists of a single table `files` that uses a hierarchical structure (adjacency list model) to represent the file system tree.

### Table: `files`

| Column         | Type        | Constraints                          | Description                                                 |
| :------------- | :---------- | :----------------------------------- | :---------------------------------------------------------- |
| `id`           | `INTEGER`   | `PRIMARY KEY AUTOINCREMENT`          | Unique identifier for each file/directory.                  |
| `name`         | `TEXT`      | `NOT NULL`                           | The name of the file or directory.                          |
| `parent_id`    | `INTEGER`   | `FOREIGN KEY`                        | References `id` of the parent directory. `NULL` for root.   |
| `path`         | `TEXT`      | `NOT NULL UNIQUE`                    | Full path (e.g., `/docs/notes.txt`). Used for fast lookups. |
| `is_directory` | `BOOLEAN`   | `NOT NULL DEFAULT 0`                 | `1` for directory, `0` for file.                            |
| `content`      | `BLOB`      | -                                    | Binary content of the file. `NULL` for directories.         |
| `size`         | `INTEGER`   | `DEFAULT 0`                          | Size of the file in bytes.                                  |
| `mime_type`    | `TEXT`      | `DEFAULT 'application/octet-stream'` | MIME type of the file.                                      |
| `etag`         | `TEXT`      | -                                    | Entity tag for cache validation.                            |
| `created_at`   | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP`          | Creation timestamp.                                         |
| `modified_at`  | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP`          | Last modification timestamp.                                |

### Relationships & Indices

- **Foreign Key**: `parent_id` references `files(id)` with `ON DELETE CASCADE`. This ensures that when a directory is deleted, all its children (files and subdirectories) are automatically deleted by the database engine.
- **Unique Index `idx_path`**: Ensures that file paths are unique across the system.
- **Index `idx_parent_id`**: Optimizes queries that list directory contents (`PROPFIND`).
- **Unique Index `idx_name_parent`**: Ensures that two files cannot have the same name within the same directory.

## Key Operations

### Path Resolution

Although the structure is hierarchical (`parent_id`), we store the full `path` for each record to allow O(1) lookup speed when accessing a file by its URL.

### Directory Listing

Listing a directory involves a simple query:

```sql
SELECT * FROM files WHERE parent_id = ? ORDER BY is_directory DESC, name ASC
```

### Move/Rename

Moving a file involves updating its `parent_id`, `name`, and `path`.
**Note**: If moving a directory, all children's `path` fields must be recursively updated to reflect the new location.

### Initialization

The database is automatically initialized with a root directory (`/`) if it doesn't exist.

## WebDAV Implementation Details

The core logic is distributed across `src/handlers.ts` and `src/db.ts`.

| Method       | Handler          | Implementation Logic                                                                                                                                                                                                                                                                                                                            |
| :----------- | :--------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **OPTIONS**  | `handleOptions`  | Returns standard WebDAV headers (`DAV`, `Allow`) to inform clients of supported features.                                                                                                                                                                                                                                                       |
| **PROPFIND** | `handlePropfind` | Retrieves file properties. <br> - **Depth 0**: Returns properties for the specific file/directory only. <br> - **Depth 1**: If it's a directory, also lists immediate children using `listDirectory`. <br> - Generates XML response compliant with RFC 4918.                                                                                    |
| **GET**      | `handleGet`      | - **File**: Returns file content (`BLOB`) with correct MIME type. <br> - **Directory**: <br> &nbsp;&nbsp; - If `Accept: application/json`: Returns a JSON array of children. <br> &nbsp;&nbsp; - Otherwise: Renders a simple HTML index page.                                                                                                   |
| **HEAD**     | `handleHead`     | Same as `GET` but returns no body. Useful for checking existence and metadata.                                                                                                                                                                                                                                                                  |
| **PUT**      | `handlePut`      | Creates or updates a file. <br> - If file exists: Updates content, size, and modification time. <br> - If new: Creates a new record. <br> - Rejects PUT on existing directories.                                                                                                                                                                |
| **MKCOL**    | `handleMkcol`    | Creates a new directory record. Fails if the path already exists.                                                                                                                                                                                                                                                                               |
| **DELETE**   | `handleDelete`   | Deletes the file/directory. <br> - Relying on foreign key `ON DELETE CASCADE`, deleting a directory automatically removes all descendants.                                                                                                                                                                                                      |
| **MOVE**     | `handleMove`     | Renames or moves a file/directory. <br> - Resolves `Destination` header (supports relative paths). <br> - If destination exists: Checks `Overwrite` header. If allowed, deletes destination first. <br> - Updates `path`, `parent_id`, and `name`. <br> - **Recursion**: If moving a directory, recursively updates the `path` of all children. |
| **COPY**     | `handleCopy`     | Copies a file/directory. <br> - **File**: Creates a new record with duplicated content. <br> - **Directory**: Recursively traverses the source tree and creates corresponding copies at the destination. <br> - Handles `Overwrite` similar to `MOVE`.                                                                                          |
