package com.meuze.app;

import android.app.Application;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;

/** Initialize Firebase in every process start, including background FCM delivery. */
public final class MeuZeApplication extends Application {
    @Override
    public void onCreate(){
        super.onCreate();
        if(BuildConfig.FCM_APP_ID.isEmpty()||BuildConfig.FCM_API_KEY.isEmpty()||
           BuildConfig.FCM_SENDER_ID.isEmpty()||BuildConfig.FCM_PROJECT_ID.isEmpty())return;
        try{
            if(FirebaseApp.getApps(this).isEmpty()){
                FirebaseOptions options=new FirebaseOptions.Builder()
                    .setApplicationId(BuildConfig.FCM_APP_ID)
                    .setApiKey(BuildConfig.FCM_API_KEY)
                    .setGcmSenderId(BuildConfig.FCM_SENDER_ID)
                    .setProjectId(BuildConfig.FCM_PROJECT_ID).build();
                FirebaseApp.initializeApp(this,options);
            }
        }catch(Exception ignored){}
    }
}
