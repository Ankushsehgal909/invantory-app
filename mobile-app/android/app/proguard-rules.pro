# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.soloader.** { *; }
-keep class com.facebook.flipper.** { *; }

# Vision Camera
-keep class com.mrousavy.camera.** { *; }

# Push Notification
-keep class com.dieam.reactnativepushnotification.** { *; }

# Async Storage
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# Network Info
-keep class com.reactnativecommunity.netinfo.** { *; }

# Image Picker
-keep class com.reactnativecommunity.imagepicker.** { *; }

# Document Picker
-keep class com.reactnativecommunity.documentpicker.** { *; }

# Keychain
-keep class com.oblador.keychain.** { *; }

# Reanimated
-keep class com.swmansion.reanimated.** { *; }

# Gesture Handler
-keep class com.swmansion.gesturehandler.** { *; }

# Screens
-keep class com.swmansion.rnscreens.** { *; }

# SVG
-keep class com.horcrux.svg.** { *; }

# Paper
-keep class org.reactnativepaper.** { *; }

# Vector Icons
-keep class com.oblador.vectoricons.** { *; }

# Quick SQLite
-keep class com.quick_sqlite.** { *; }

# Network Security Config
-keep class javax.net.ssl.** { *; }

# OkHttp
-keep class okhttp3.** { *; }
-keep class okio.** { *; }

# Gson
-keep class com.google.gson.** { *; }

# Kotlin
-keep class kotlin.** { *; }

# Java 8 APIs
-dontwarn java.nio.file.**
-dontwarn java.lang.module.**
-dontwarn java.lang.invoke.**

# Suppress warnings
-dontwarn com.facebook.**
-dontwarn com.swmansion.**
-dontwarn com.mrousavy.**
-dontwarn com.dieam.**
-dontwarn com.reactnativecommunity.**
-dontwarn com.oblador.**
-dontwarn org.reactnativepaper.**