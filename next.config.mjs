/** @type {import('next').NextConfig} */
// No `env` block on purpose: it inlines values at build time, which would bake
// secrets into the image and make Cloud Run's runtime env vars inert. Every
// variable above is read server-side at runtime; only NEXT_PUBLIC_* needs
// build-time inlining, and Next.js does that natively.
const nextConfig = {
  output: "standalone"
}

export default nextConfig
