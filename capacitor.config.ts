import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'br.com.anacron.selfmoney',
  appName: 'SelfMoney',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
  },
}

export default config
