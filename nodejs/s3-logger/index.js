import { config } from 'dotenv'
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { fromEnv } from '@aws-sdk/credential-provider-env'

import moment from 'moment'

// Load environment variables from .env file
config()

// Get the AWS credentials from the local environment
const credentials = fromEnv()

// Get the AWS region and S3 bucket name from the local environment
const region = process.env.AWS_REGION
const bucketName = process.env.S3_BUCKET_NAME
const prefix = process.env.S3_PREFIX

// Create a new instance of the S3 client with your AWS credentials
const s3 = new S3Client({
  region: region,
  credentials: credentials
})

async function handler(event) {
  const status = await appendMessageToS3(event.message)

  return {
    status: status
  }
}

async function appendMessageToS3(message) {
  let status = true

  try {
    // Get the current date in "YYYY-MM" format
    const currentDate = moment().format('YYYY-MM')

    // Create a unique file name with the current date
    const fileName = `${prefix}/${currentDate}.log`
    // Get the current date and time in "YYYY-MM-DD HH:mm:ss" format
    const currentDateTime = moment().format('YYYY-MM-DD HH:mm:ss')

    // Check if the file for the current month already exists in S3
    try {
      // If the file exists, append the message to the end of the file
      const { Body } = await s3.send(new GetObjectCommand({
        Bucket: bucketName,
        Key: fileName
      }))

      const fileContent = await streamToString(Body)
      const content = `${fileContent}[${currentDateTime}] ${message}\n`

      await s3.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: fileName,
        Body: content
      }))

      console.log(`File updated: ${fileName}`)
    } catch (error) {
      if (error.name === 'NoSuchKey') {
        // If the file does not exist, create a new file with the message
        const content = `[${currentDateTime}] ${message}\n`

        await s3.send(new PutObjectCommand({
          Bucket: bucketName,
          Key: fileName,
          Body: content
        }))

        console.log(`File created: ${fileName}`)
      } else {
        status = false
      }
    }
  } catch (error) {
    status = false
  }

  return status
}

async function streamToString(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

export default handler