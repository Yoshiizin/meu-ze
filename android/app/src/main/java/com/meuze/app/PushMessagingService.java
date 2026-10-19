package com.meuze.app;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.media.ToneGenerator;
import android.media.AudioManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.Map;
import java.util.concurrent.Executors;

public final class PushMessagingService extends FirebaseMessagingService {
    private static final String CHANNEL = "meuze_chat_popup_v1";
    private static final String SETTINGS = "meuze_push";
    private static final String SOUND_ORIGIN = "https://bfmrrtcepuxuazsuqxjn.supabase.co/storage/v1/object/public/meuze-media/";
    private static final int MAX_SOUND_BYTES = 8 * 1024 * 1024;

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        getSharedPreferences(SETTINGS,MODE_PRIVATE).edit().putString("token",token).apply();
    }

    @Override
    public void onMessageReceived(RemoteMessage remote) {
        super.onMessageReceived(remote);
        Map<String,String> data=remote.getData();
        String userId=data.get("userId");
        if(userId==null||!userId.equals(getSharedPreferences(SETTINGS,MODE_PRIVATE).getString("user","")))return;
        if(MainActivity.isForeground)return; // Foreground already has the site's chat alerts.
        String thread=data.get("thread");
        if(thread==null||thread.length()>100)return;
        String title=data.get("title"),body=data.get("body");
        if(title==null||body==null)return;
        JSONObject prefs;
        try{prefs=new JSONObject(getSharedPreferences(SETTINGS,MODE_PRIVATE).getString("prefs-"+userId,"{}"));}
        catch(Exception e){return;}
        if(!prefs.optBoolean("enabled",true)||!prefs.optBoolean("pushEnabled",false))return;
        JSONObject chats=prefs.optJSONObject("chats");
        JSONObject chat=chats==null?null:chats.optJSONObject(thread);
        String override=chat==null?"default":chat.optString("tone","default");
        String tone="default".equals(override)?prefs.optString("tone","fears"):override;
        if("off".equals(tone))return; // Conversation muted: suppress the entire popup.
        int volume=Math.max(0,Math.min(100,prefs.optInt("volume",80)));
        showNotification(title,body,thread,data.get("messageId"));
        if(volume>0)playSound(tone,chat,prefs,volume);
    }

    private void showNotification(String title,String body,String thread,String messageId) {
        if(Build.VERSION.SDK_INT>=33&&checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)return;
        NotificationManager manager=(NotificationManager)getSystemService(Context.NOTIFICATION_SERVICE);
        NotificationChannel channel=new NotificationChannel(CHANNEL,"Mensagens do Meu Zé",NotificationManager.IMPORTANCE_HIGH);
        channel.setDescription("Avisos de novas mensagens no grupo e nas conversas");
        channel.setSound(null,null); // App plays the user's per-chat selected audio itself.
        channel.enableVibration(true);
        manager.createNotificationChannel(channel);
        Intent open=new Intent(this,MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);
        open.putExtra("thread",thread);
        PendingIntent pending=PendingIntent.getActivity(this,thread.hashCode(),open,
            PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        Notification notification=new Notification.Builder(this,CHANNEL)
            .setSmallIcon(android.R.drawable.stat_notify_chat)
            .setContentTitle(title.length()>90?title.substring(0,90):title)
            .setContentText(body.length()>200?body.substring(0,200):body)
            .setStyle(new Notification.BigTextStyle().bigText(body))
            .setCategory(Notification.CATEGORY_MESSAGE)
            .setContentIntent(pending).setAutoCancel(true)
            .setPriority(Notification.PRIORITY_HIGH).build();
        manager.notify(messageId==null?thread.hashCode():messageId.hashCode(),notification);
    }

    private void playSound(String tone,JSONObject chat,JSONObject prefs,int volume){
        if("retro".equals(tone)){
            try{
                ToneGenerator beep=new ToneGenerator(AudioManager.STREAM_NOTIFICATION,volume);
                beep.startTone(ToneGenerator.TONE_PROP_BEEP2,230);
                new Handler(Looper.getMainLooper()).postDelayed(beep::release,400);
            }catch(Exception ignored){}
            return;
        }
        if("custom".equals(tone)){
            String url=chat!=null&&"custom".equals(chat.optString("tone"))?
                chat.optString("customUrl",prefs.optString("customUrl","")):prefs.optString("customUrl","");
            File file=cachedSound(this,url);
            if(file!=null&&file.exists()){
                try{
                    MediaPlayer player=new MediaPlayer();
                    player.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
                    player.setDataSource(file.getAbsolutePath());
                    player.setVolume(volume/100f,volume/100f);
                    player.setOnCompletionListener(MediaPlayer::release);
                    player.setOnErrorListener((mp,what,extra)->{mp.release();return true;});
                    player.prepare();player.start();return;
                }catch(Exception ignored){}
            }
        }
        try{
            MediaPlayer player=MediaPlayer.create(this,R.raw.fears_to_fathom_notification);
            if(player==null)return;
            player.setVolume(volume/100f,volume/100f);
            player.setOnCompletionListener(MediaPlayer::release);
            player.start();
        }catch(Exception ignored){}
    }

    static void cacheCustomSounds(Context context,String json){
        Executors.newSingleThreadExecutor().execute(()->{
            try{
                JSONObject prefs=new JSONObject(json);
                String global=prefs.optString("customUrl","");
                downloadSound(context,global);
                JSONObject chats=prefs.optJSONObject("chats");
                if(chats!=null){
                    java.util.Iterator<String> ids=chats.keys();
                    while(ids.hasNext()){
                        JSONObject chat=chats.optJSONObject(ids.next());
                        if(chat!=null&&"custom".equals(chat.optString("tone")))
                            downloadSound(context,chat.optString("customUrl",""));
                    }
                }
            }catch(Exception ignored){}
        });
    }

    private static File cachedSound(Context context,String url){
        if(url==null||!url.startsWith(SOUND_ORIGIN)||url.length()>2000||!url.matches("https://[^\\s]+\\.(mp3|m4a|ogg)"))return null;
        try{
            byte[] hash=MessageDigest.getInstance("SHA-256").digest(url.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder hex=new StringBuilder();
            for(int i=0;i<12;i++)hex.append(String.format("%02x",hash[i]));
            return new File(context.getCacheDir(),"meuze-push-"+hex+".audio");
        }catch(Exception e){return null;}
    }
    private static void downloadSound(Context context,String url){
        File dest=cachedSound(context,url);
        if(dest==null||dest.exists())return;
        HttpURLConnection conn=null;
        try{
            conn=(HttpURLConnection)new URL(url).openConnection();
            conn.setInstanceFollowRedirects(false);
            conn.setConnectTimeout(7000);conn.setReadTimeout(10000);
            if(conn.getResponseCode()!=200||conn.getContentLengthLong()>MAX_SOUND_BYTES)return;
            File temp=new File(context.getCacheDir(),dest.getName()+".tmp");
            try(InputStream in=conn.getInputStream();FileOutputStream out=new FileOutputStream(temp)){
                byte[] bytes=new byte[8192];int count,total=0;
                while((count=in.read(bytes))!=-1){total+=count;if(total>MAX_SOUND_BYTES)throw new Exception("Sound too large");out.write(bytes,0,count);}
            }
            if(!temp.renameTo(dest))temp.delete();
        }catch(Exception ignored){}
        finally{if(conn!=null)conn.disconnect();}
    }
}
