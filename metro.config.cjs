const { getDefaultConfig } = require("expo/metro-config");
const config = getDefaultConfig(__dirname);
// The shared client uses Node ESM .js specifiers; Metro consumes its TS sources.
config.resolver.resolveRequest = (context, name, platform) => {
  if (name.startsWith(".") && name.endsWith(".js")) {
    try {
      return context.resolveRequest(context, name.slice(0, -3), platform);
    } catch {
      /* Fall back to real JavaScript dependencies. */
    }
  }
  return context.resolveRequest(context, name, platform);
};
module.exports = config;
