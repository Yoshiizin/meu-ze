package com.meuze.app;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Build;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.FirebaseMessaging;

public final class PushBridge {
    private final MainActivity activity;
    private final WebView web;
    private static final String PREFS="meuze_push";
    PushBridge(MainActivity activity,WebView web){this.activity=activity;this.web=web;}

    @JavascriptInterface
    public boolean isAvailable(){
        return FirebaseApp.getApps(activity).size()>0;
    }
    @JavascriptInterface
    public void refreshToken(){
        if(!isAvailable())return;
        activity.runOnUiThread(()->FirebaseMessaging.getInstance().getToken()
            .addOnSuccessListener(token->{
                activity.getSharedPreferences(PREFS,Context.MODE_PRIVATE).edit().putString("token",token).apply();
                activity.sendPushTokenToPage(token);
            }));
    }
    @JavascriptInterface
    public void requestNotifications(){
        if(!isAvailable())return;
        activity.runOnUiThread(()->{
            if(Build.VERSION.SDK_INT>=33&&activity.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED){
                activity.requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},1119);
            }else refreshToken();
        });
    }
    @JavascriptInterface
    public void syncSettings(String user,String json){
        if(user==null||!user.matches("[0-9a-fA-F-]{36}")||json==null||json.length()>15000)return;
        activity.getSharedPreferences(PREFS,Context.MODE_PRIVATE).edit()
            .putString("user",user).putString("prefs-"+user,json).apply();
        PushMessagingService.cacheCustomSounds(activity.getApplicationContext(),json);
    }
    @JavascriptInterface
    public void clearUser(){
        activity.getSharedPreferences(PREFS,Context.MODE_PRIVATE).edit().remove("user").apply();
    }
}
