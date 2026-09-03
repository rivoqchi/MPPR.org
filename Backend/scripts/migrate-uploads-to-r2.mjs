#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const UPLOADS_DIR = path.join(ROOT_DIR, 'uploads');
const GUIDE_VIDEOS_DIR = path.join(UPLOADS_DIR, 'guide-videos');
const GUIDE_TMP_DIR = path.join(GUIDE_VIDEOS_DIR, 'tmp');

function loadEnvFile() {
  const envPath = path.join(ROOT_DIR, '.env');
  if (!statSync(envPath, { throwIfNoEntry: false })?.isFile()) {
    return;
  }

  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    process.env[key] ??= value;
  }
}

function guessContentType(fileName) {
  const extension = fileName.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'pdf':
      return 'application/pdf';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'mp4':
      return 'video/mp4';
    case 'webm':
      return 'video/webm';
    default:
      return 'application/octet-stream';
  }
}

function createR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;
  const endpoint =
    process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error(
      'Missing R2 env vars. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME in Backend/.env',
    );
  }

  return {
    bucketName,
    client: new S3Client({
      region: 'auto',
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    }),
  };
}

async function uploadFile(client, bucketName, key, filePath, dryRun) {
  const body = readFileSync(filePath);
  const contentType = guessContentType(path.basename(filePath));

  if (dryRun) {
    console.log(`[dry-run] ${filePath} -> ${key} (${body.length} bytes)`);
    return;
  }

  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );

  console.log(`uploaded ${key} (${body.length} bytes)`);
}

async function main() {
  loadEnvFile();

  const dryRun = process.argv.includes('--dry-run');
  const { client, bucketName } = createR2Client();

  let objectCount = 0;
  let guideCount = 0;

  if (statSync(UPLOADS_DIR, { throwIfNoEntry: false })?.isDirectory()) {
    for (const entry of readdirSync(UPLOADS_DIR)) {
      const filePath = path.join(UPLOADS_DIR, entry);
      if (!statSync(filePath).isFile()) {
        continue;
      }

      await uploadFile(client, bucketName, `objects/${entry}`, filePath, dryRun);
      objectCount += 1;
    }
  }

  if (statSync(GUIDE_VIDEOS_DIR, { throwIfNoEntry: false })?.isDirectory()) {
    for (const entry of readdirSync(GUIDE_VIDEOS_DIR)) {
      if (entry === 'tmp') {
        continue;
      }

      const filePath = path.join(GUIDE_VIDEOS_DIR, entry);
      if (!statSync(filePath).isFile()) {
        continue;
      }

      await uploadFile(client, bucketName, `guide-videos/${entry}`, filePath, dryRun);
      guideCount += 1;
    }
  }

  console.log(
    `${dryRun ? 'Dry-run complete' : 'Migration complete'}: ${objectCount} object(s), ${guideCount} guide video(s)`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
