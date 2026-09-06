require('dotenv').config({ path: __dirname + '/.env' });

module.exports = {
  apps: [{
    name: "date-date-love",
    script: ".output/server/index.mjs",
    env: {
      PORT: process.env.PORT || 5009,
      EXT_SUPABASE_URL: process.env.EXT_SUPABASE_URL,
      EXT_SUPABASE_SERVICE_ROLE_KEY: process.env.EXT_SUPABASE_SERVICE_ROLE_KEY,
      FREEPAY_PUBLIC_KEY: process.env.FREEPAY_PUBLIC_KEY,
      FREEPAY_SECRET_KEY: process.env.FREEPAY_SECRET_KEY,
    }
  }]
};
