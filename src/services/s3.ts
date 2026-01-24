import {S3Client} from '@aws-sdk/client-s3';
import {PutObjectCommand} from '@aws-sdk/client-s3';

export const s3 = new S3Client({
    region: process.env.CLOUDRU_S3_REGION,
    endpoint: process.env.CLOUDRU_S3_ENDPOINT,
    credentials: {
        accessKeyId: process.env.CLOUDRU_S3_ACCESS_KEY,
        secretAccessKey: process.env.CLOUDRU_S3_SECRET_KEY,
    },
    forcePathStyle: true,
});


export async function uploadToS3(file: File) {
    const buffer = Buffer.from(await file.arrayBuffer());

    const key = `cards/${Date.now()}_${file.name}`;

    await s3.send(
        new PutObjectCommand({
            Bucket: process.env.CLOUDRU_S3_BUCKET,
            Key: key,
            Body: buffer,
            ContentType: file.type,
        })
    );

    return `${process.env.CLOUDRU_S3_ENDPOINT}/${process.env.CLOUDRU_S3_BUCKET}/${key}`;
}
