import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.scalevo.schoolerp',
  appName: 'Sclevo School ERP',
  webDir: 'android-web',
  server: {
    url: 'https://scalevoschoolerp.vercel.app/login',
    cleartext: true,
    androidScheme: 'https',
    allowNavigation: [
      'scalevoschoolerp.vercel.app',
      '*.vercel.app',
      'checkout.razorpay.com',
      'api.razorpay.com',
      'res.cloudinary.com',
    ],
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#0a1208',
  },
};

export default config;
