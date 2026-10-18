import './globals.css';
import type { Metadata, Viewport } from 'next';
export const metadata: Metadata = {
  title: 'Meu Zé — a internet é nossa',
  description: 'Um cantinho só nosso. Amigos, descobertas e perfis com personalidade.',
  applicationName: 'Meu Zé',
  manifest: '/manifest.webmanifest',
  icons: { icon: [{url:'/icon-192.png',sizes:'192x192',type:'image/png'}, {url:'/icon-512.png',sizes:'512x512',type:'image/png'}], apple:'/apple-touch-icon.png' },
  appleWebApp: { capable:true, statusBarStyle:'default', title:'Meu Zé' },
};
export const viewport: Viewport = {themeColor:'#0b1730', width:'device-width', initialScale:1};
export default function Layout({children}:{children:React.ReactNode}) {return <html lang="pt-BR"><body>{children}</body></html>}
