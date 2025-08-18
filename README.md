# ia
try
IndustrialSearch Android App
============================

How to open in Android Studio:

1. Open Android Studio (Giraffe/Flamingo or newer).
2. File > Open > select `/workspace`.
3. Wait for Gradle sync. If prompted to use Gradle wrapper, accept.
4. Select the `app` run configuration and click Run.

Notes:
- Min SDK 24, Target/Compile SDK 34.
- Uses Jetpack Compose, Hilt, Room, Retrofit, WorkManager, Coil, Jsoup.
- Manifest contains INTERNET/NETWORK permissions. WorkManager is auto-configured via Hilt.
