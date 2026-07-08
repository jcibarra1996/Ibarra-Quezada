import nextConfig from "eslint-config-next";

const config = [
  ...nextConfig,
  {
    ignores: ["supabase/functions/**"],
  },
];

export default config;
