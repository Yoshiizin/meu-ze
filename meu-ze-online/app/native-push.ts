'use client';
import {getSupabase} from '../lib/supabase';
import {readNotificationPreferences,type NotificationPreferences} from './chat-notifications';

declare global {
  interface Window {
    MeuZeAndroid?:{
      isAvailable:()=>boolean;
      refreshToken:()=>void;
      requestNotifications:()=>void;
      syncSettings:(user:string,prefs:string)=>void;
      clearUser:()=>void;
    };
  }
}
let currentToken='';
export function nativePushAvailable(){
  try{return typeof window!=='undefined'&&window.MeuZeAndroid?.isAvailable()===true}
  catch{return false}
}
export function syncNativeSettings(user:string,prefs:NotificationPreferences){
  if(!user||!nativePushAvailable())return;
  try{window.MeuZeAndroid?.syncSettings(user,JSON.stringify(prefs))}catch{}
}
export async function registerNativeToken(user:string,token:string){
  if(!user||!nativePushAvailable()||!token||token.length>4096)return;
  currentToken=token;
  const sb=getSupabase();
  if(!sb)return;
  try{
    const {data:{session}}=await sb.auth.getSession();
    if(!session||session.user.id!==user)return;
    const prefs=readNotificationPreferences(user);
    syncNativeSettings(user,prefs);
    const enabled=prefs.enabled&&prefs.pushEnabled;
    await fetch('/api/push/register',{
      method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},
      body:JSON.stringify({token,enabled}),cache:'no-store'
    });
  }catch{/* Push errors must never interrupt the site. */}
}
export async function unregisterNativeToken(user:string){
  const sb=getSupabase();
  if(sb&&user&&currentToken){
    try{
      const {data:{session}}=await sb.auth.getSession();
      if(session?.user.id===user){
        await fetch('/api/push/register',{
          method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},
          body:JSON.stringify({token:currentToken,enabled:false}),cache:'no-store'
        });
      }
    }catch{}
  }
  currentToken='';
  try{window.MeuZeAndroid?.clearUser()}catch{}
}
