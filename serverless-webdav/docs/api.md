# WebDAV API Reference

This document provides examples of common WebDAV operations using `curl`.

**Base URL**: `https://your-worker.workers.dev` (Replace with your actual deployment URL or `http://127.0.0.1:8787` for local dev)
**Auth**: Basic Authentication (`-u user:pass`)

## 1. List Directory (PROPFIND)

Retrieves properties for a resource. To list directory contents, use `Depth: 1`.

```bash
# List root directory
curl -X PROPFIND -u user:pass "https://your-worker.workers.dev/" -H "Depth: 1"

# List specific folder
curl -X PROPFIND -u user:pass "https://your-worker.workers.dev/docs/" -H "Depth: 1"
```

## 2. Upload File (PUT)

Uploads a file to the server.

```bash
# Upload a text file
curl -X PUT -u user:pass "https://your-worker.workers.dev/notes.txt" --data "Hello WebDAV"

# Upload a local binary file
curl -X PUT -u user:pass "https://your-worker.workers.dev/image.png" --data-binary @/path/to/local/image.png
```

## 3. Download File (GET)

Retrieves the content of a file.

```bash
# Download to stdout
curl -X GET -u user:pass "https://your-worker.workers.dev/notes.txt"

# Download and save to file
curl -X GET -u user:pass "https://your-worker.workers.dev/image.png" -o downloaded_image.png
```

## 4. Create Directory (MKCOL)

Creates a new collection (directory).

```bash
curl -X MKCOL -u user:pass "https://your-worker.workers.dev/new-folder"
```

## 5. Move / Rename (MOVE)

Moves a resource to a new URI. Used for both moving and renaming.

```bash
# Rename file
curl -X MOVE -u user:pass "https://your-worker.workers.dev/old.txt" \
     -H "Destination: /new.txt"

# Move file to another folder
curl -X MOVE -u user:pass "https://your-worker.workers.dev/file.txt" \
     -H "Destination: /archive/file.txt"
```

_Note: The `Destination` header supports both absolute URLs and absolute paths (starting with `/`)._

## 6. Copy (COPY)

Copies a resource to a new URI.

```bash
curl -X COPY -u user:pass "https://your-worker.workers.dev/source.txt" \
     -H "Destination: /backup/source_copy.txt"
```

## 7. Delete (DELETE)

Removes a resource. If it's a directory, it deletes it recursively.

```bash
curl -X DELETE -u user:pass "https://your-worker.workers.dev/file-to-delete.txt"
```

## 8. Get Directory Index (Custom GET)

Our implementation supports viewing directories in the browser or getting a JSON listing.

```bash
# Get HTML view (Default)
curl -X GET -u user:pass "https://your-worker.workers.dev/docs/"

# Get JSON listing
curl -X GET -u user:pass "https://your-worker.workers.dev/docs/" -H "Accept: application/json"
```

**JSON Response Example:**

```json
[
	{
		"name": "notes.txt",
		"path": "/docs/notes.txt",
		"is_directory": false,
		"size": 12,
		"mime_type": "text/plain",
		"modified_at": "2023-10-27T10:00:00.000Z",
		"created_at": "2023-10-27T10:00:00.000Z"
	}
]
```
