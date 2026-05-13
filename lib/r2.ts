import { DeleteObjectsCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

type UploadableFile = {
  name: string
  type?: string
  arrayBuffer: () => Promise<ArrayBuffer>
}

const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME
const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL

if (!accountId) throw new Error('Missing CLOUDFLARE_R2_ACCOUNT_ID')
if (!accessKeyId) throw new Error('Missing CLOUDFLARE_R2_ACCESS_KEY_ID')
if (!secretAccessKey) throw new Error('Missing CLOUDFLARE_R2_SECRET_ACCESS_KEY')
if (!bucketName) throw new Error('Missing CLOUDFLARE_R2_BUCKET_NAME')
if (!publicUrl) throw new Error('Missing CLOUDFLARE_R2_PUBLIC_URL')

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
})

function getContentType(file: UploadableFile) {
  if (file.type) return file.type

  const fileName = file.name.toLowerCase()

  if (fileName.endsWith('.wav')) return 'audio/wav'
  if (fileName.endsWith('.mp3')) return 'audio/mpeg'
  if (fileName.endsWith('.m4a')) return 'audio/mp4'
  if (fileName.endsWith('.aac')) return 'audio/aac'
  if (fileName.endsWith('.ogg')) return 'audio/ogg'
  if (fileName.endsWith('.flac')) return 'audio/flac'
  if (fileName.endsWith('.webp')) return 'image/webp'
  if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) return 'image/jpeg'
  if (fileName.endsWith('.png')) return 'image/png'

  return 'application/octet-stream'
}

const publicBaseUrl = publicUrl.replace(/\/$/, '')

function buildPublicUrl(key: string) {
  return `${publicBaseUrl}/${key.replace(/^\//, '')}`
}

export async function uploadFileToR2({
  file,
  key,
}: {
  file: UploadableFile
  key: string
}) {
  const arrayBuffer = await file.arrayBuffer()
  const body = new Uint8Array(arrayBuffer)
  const contentType = getContentType(file)

  await r2Client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  )

  return buildPublicUrl(key)
}

export async function deleteFilesFromR2(keys: string[]) {
  const cleanKeys = keys
    .map((key) => key.trim().replace(/^\//, ''))
    .filter(Boolean)

  if (!cleanKeys.length) return

  await r2Client.send(
    new DeleteObjectsCommand({
      Bucket: bucketName,
      Delete: {
        Objects: cleanKeys.map((key) => ({ Key: key })),
        Quiet: true,
      },
    })
  )
}