const path = require('path');

// Build configuration for different environments
const buildConfig = {
  // Development configuration
  development: {
    mode: 'development',
    devtool: 'source-map',
    optimization: {
      minimize: false
    }
  },
  
  // Production configuration
  production: {
    mode: 'production',
    devtool: 'hidden-source-map',
    optimization: {
      minimize: true
    }
  },
  
  // Test configuration
  test: {
    mode: 'development',
    devtool: 'inline-source-map',
    optimization: {
      minimize: false
    }
  }
};

// Get configuration based on NODE_ENV
function getBuildConfig() {
  const env = process.env.NODE_ENV || 'development';
  return buildConfig[env] || buildConfig.development;
}

module.exports = {
  buildConfig,
  getBuildConfig
};