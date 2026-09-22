/** @type {import('next').NextConfig} */
const config = {
  experimental: {
    staleTimes: { dynamic: 0, static: 30 },
  },
};
export default config;
