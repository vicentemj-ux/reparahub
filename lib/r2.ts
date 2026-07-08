import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3"

const s3Endpoint = process.env.S3_ENDPOINT
const s3Region = process.env.S3_REGION || "us-east-1"
const s3AccessKeyId = process.env.S3_ACCESS_KEY_ID
const s3SecretAccessKey = process.env.S3_SECRET_ACCESS_KEY
const s3Bucket = process.env.S3_BUCKET
const s3PublicBaseUrl = process.env.S3_PUBLIC_BASE_URL

const legacyR2AccountId = process.env.R2_ACCOUNT_ID
const legacyR2AccessKeyId = process.env.R2_ACCESS_KEY_ID
const legacyR2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY
const legacyR2Bucket = process.env.R2_BUCKET
const legacyR2PublicBaseUrl = process.env.R2_PUBLIC_BASE_URL

const DEFAULT_BUCKET = "reparahub-app"

type StorageConfig = {
  accessKeyId: string
  secretAccessKey: string
  bucket: string
  endpoint: string
  region: string
  forcePathStyle: boolean
  publicBaseUrl?: string
}

function getStorageConfig(): StorageConfig {
  if (s3Endpoint && s3AccessKeyId && s3SecretAccessKey && s3Bucket) {
    return {
      accessKeyId: s3AccessKeyId,
      secretAccessKey: s3SecretAccessKey,
      bucket: s3Bucket,
      endpoint: s3Endpoint,
      region: s3Region,
      forcePathStyle: true,
      publicBaseUrl: s3PublicBaseUrl,
    }
  }

  if (legacyR2AccountId && legacyR2AccessKeyId && legacyR2SecretAccessKey && legacyR2Bucket) {
    return {
      accessKeyId: legacyR2AccessKeyId,
      secretAccessKey: legacyR2SecretAccessKey,
      bucket: legacyR2Bucket,
      endpoint: `https://${legacyR2AccountId}.r2.cloudflarestorage.com`,
      region: "auto",
      forcePathStyle: false,
      publicBaseUrl: legacyR2PublicBaseUrl,
    }
  }

  throw new Error("S3 env vars are incomplete")
}

function getClient() {
  const config = getStorageConfig()
  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  })
}

export async function uploadFileToS3(params: {
  key: string
  body: Buffer | Uint8Array | string
  contentType?: string
}) {
  const client = getClient()
  const config = getStorageConfig()
  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
    }),
  )

  return {
    key: params.key,
    url: getPublicUrl(params.key),
  }
}

export async function deleteFromS3(key: string) {
  const client = getClient()
  const config = getStorageConfig()
  await client.send(
    new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: key,
    }),
  )
}

export function getPublicUrl(key: string) {
  const cleanKey = key.replace(/^\/+/, "")
  const publicBaseUrl = s3PublicBaseUrl || legacyR2PublicBaseUrl
  if (!publicBaseUrl) return cleanKey
  return `${publicBaseUrl.replace(/\/$/, "")}/${cleanKey}`
}

export function sanitizeFileName(fileName: string) {
  const trimmed = fileName.trim()
  // Only lowercase the name, not the extension — preserving the original case
  // prevents mismatches with case-sensitive storage backends.
  const base = trimmed
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
  return base || "foto.webp"
}

export function getPublicTrackPhotoKey(params: {
  tenantId: string
  reparacionId: string
  archivoId: string
  fileName: string
}) {
  const safe = sanitizeFileName(params.fileName)
  return `repairs/intake/${params.tenantId}/${params.reparacionId}/${params.archivoId}-${safe}`
}

export function getStorageBucketName() {
  return s3Bucket || legacyR2Bucket || DEFAULT_BUCKET
}

// Backwards-compatible exports while call sites are migrated to S3 naming.
export const getR2BucketName = getStorageBucketName
export const uploadFileToR2 = uploadFileToS3
export const deleteFromR2 = deleteFromS3
