export default {
  expo: {
    name: "Events Circle · Circle AI",
    slug: "events-circle-ai",
    version: "0.1.0",
    orientation: "portrait",
    userInterfaceStyle: "light",
    scheme: "events-circle-ai",
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.eventscircle.circleai",
    },
    android: { package: "com.eventscircle.circleai" },
    plugins: ["expo-secure-store"],
    web: { bundler: "metro" },
  },
};
