/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  env: {
    GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT,
    GOOGLE_CLOUD_LOCATION: process.env.GOOGLE_CLOUD_LOCATION,
    GEMINI_MODEL: process.env.GEMINI_MODEL,
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    TWILIO_WHATSAPP_FROM: process.env.TWILIO_WHATSAPP_FROM,
    GCS_BUCKET_NAME: process.env.GCS_BUCKET_NAME,
    DOCUMENT_AI_LOCATION: process.env.DOCUMENT_AI_LOCATION,
    DOCUMENT_AI_PROCESSOR_ID: process.env.DOCUMENT_AI_PROCESSOR_ID
  }
}

export default nextConfig
