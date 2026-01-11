# Serverless WebDAV

> [中文版](./README.zh-CN.md) | [English](./README.md)

A lightweight, scalable WebDAV server implementation built on **Cloudflare Workers** and **Cloudflare D1 Database**.

## Features

- **Full WebDAV Support**: Implements core methods including `OPTIONS`, `PROPFIND`, `GET`, `HEAD`, `PUT`, `MKCOL`, `DELETE`, `MOVE`, and `COPY`.
- **Serverless Architecture**: Runs entirely on the edge via Cloudflare Workers with no permanent server maintenance.
- **Database Backed**: File metadata and content (stored as BLOBs) are managed in Cloudflare D1 (SQLite).
- **Secure**: Basic Authentication support via Cloudflare Secrets Store.
- **Easy Deployment**: Managed with Wrangler.

## Limitations

- **File Size**: Due to [Cloudflare D1's row size limit](https://developers.cloudflare.com/d1/platform/limits/), individual files (BLOBs) cannot exceed **2 MB**. For larger file support, integration with Cloudflare R2 is recommended.

## Documentation

- [Architecture Design](docs/arch.md): Detailed information about database schema and WebDAV implementation.
- [API Reference](docs/api.md): Common WebDAV operations with `curl` examples.

## Prerequisites

- [Node.js](https://nodejs.org/) installed.
- A Cloudflare account.

## Getting Started

### 1. Clone and Install

```bash
git clone https://github.com/your-username/serverless-webdav.git
cd serverless-webdav
npm install
```

### 2. Configuration

Copy the example configuration or edit `wrangler.jsonc`. You'll need to create a D1 database:

```bash
npx wrangler d1 create webdav-db
```

Update the `database_id` in `wrangler.jsonc` with the ID provided by the command above.

### 3. Set Up Authentication

#### Local Development

Use **Wrangler Secrets Store** for local development. Create the secrets as follows:

```bash
# Set a secret in your store
npx wrangler secrets-store secret create 1f9c517029c347819072fcb45994c5ae --name WEBDAV_AUTH_PASS --value 123 --scopes workers
npx wrangler secrets-store secret create 1f9c517029c347819072fcb45994c5ae --name WEBDAV_AUTH_USER --value admin --scopes workers
```

This sets the username to `admin` and password to `123` for Basic Authentication.

#### Production (Cloudflare Secrets Store)

In the Cloudflare dashboard, go to the [Secrets Store page](https://developers.cloudflare.com/secrets-store/manage-secrets/how-to/) and create the following secrets:

- `WEBDAV_AUTH_USER`: Your desired username.
- `WEBDAV_AUTH_PASS`: Your desired password.

### 4. Development and Testing

```bash
# Start local development server
npm run dev

# Run unit tests
npm test

# Run bash integration tests (requires server running)
chmod +x integration-test.sh
./integration-test.sh
```

### 5. Deployment

```bash
npm run deploy
```

## Supported Clients

Since this follows standard WebDAV protocols, it works with:

- macOS Finder (`Go` -> `Connect to Server...`)
- Windows File Explorer (`Add a network location`)
- Cyberduck
- Transmit
- Rclone

## Architecture

- **`src/index.ts`**: Main entry point, handles HTTP routing and WebDAV XML generation.
- **`src/db.ts`**: Database schema and CRUD operations for file management.

## License

MIT
