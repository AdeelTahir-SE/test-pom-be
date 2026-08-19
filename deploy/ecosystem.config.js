// pm2 process definition for the push notification delivery worker.
module.exports = {
  apps: [
    {
      name: "push-delivery-worker",
      cwd: "/root/deployment/pomocnik/pom-be",
      script: "npx",
      args: "tsx --env-file=.env.worker workers/push-delivery-worker.ts",
      interpreter: "none",
      autorestart: true,
      restart_delay: 5000,
      max_restarts: 50,
      // Recycle periodically so a leaked connection/handle from a bad
      // iteration can't accumulate indefinitely; the poll loop resumes
      // immediately since notification_delivery_jobs is durable.
      max_memory_restart: "300M",
      cron_restart: "0 */6 * * *",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
