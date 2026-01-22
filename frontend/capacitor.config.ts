import type { CapacitorConfig } from '@capacitor/cli'

const isDev = process.env.NODE_ENV !== 'production'

const config: CapacitorConfig = {
  appId: 'com.surveyflow.app',
  appName: 'SurveyFlow',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: isDev
    ? {
        androidScheme: 'http',
        cleartext: true,
      }
    : undefined,
}

export default config
