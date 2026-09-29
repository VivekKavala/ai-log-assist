export const SAMPLES: Record<string, string> = {
  "K8s CrashLoopBackOff": `2026-09-28T10:01:12Z Successfully assigned prod/orders-api-7d9f to node-2
2026-09-28T10:01:15Z Pulled container image "registry.local/orders-api:1.4.2"
2026-09-28T10:01:16Z Started container orders-api
2026-09-28T10:01:17Z Error: Cannot read properties of undefined (reading 'DATABASE_URL')
2026-09-28T10:01:18Z Container orders-api terminated with exit code 1
2026-09-28T10:01:45Z Back-off restarting failed container orders-api
orders-api-7d9f   0/1   CrashLoopBackOff   5   3m`,
  "Docker port conflict": `Step 6/6 : CMD ["node","server.js"]
Successfully built 3fa2c1
docker: Error response from daemon: driver failed programming external connectivity on endpoint web: Bind for 0.0.0.0:3000 failed: port is already allocated.`,
  "npm ERESOLVE": `npm ERR! code ERESOLVE
npm ERR! ERESOLVE unable to resolve dependency tree
npm ERR! Found: react@19.0.0
npm ERR! Could not resolve dependency:
npm ERR! peer react@"^17.0.0" from react-legacy-lib@2.1.0`,
  "DB connection refused": `[INFO] Starting application on port 8080
[ERROR] Failed to initialize datasource
Caused by: java.net.ConnectException: Connection refused (Connection refused)
  at com.mysql.cj.protocol.a.NativeSocketConnection.connect
Communications link failure. The last packet sent successfully to the server was 0 milliseconds ago.`,
};
