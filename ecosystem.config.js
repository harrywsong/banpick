module.exports = {
  apps: [
    {
      name: 'vct-frontend',
      script: 'node_modules/.bin/next',
      args: 'start -p 4002',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 4002,
      },
    },
    {
      name: 'vct-server',
      script: 'server/index.js',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production',
        PORT: 4003,
      },
    },
  ],
};
