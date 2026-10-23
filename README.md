# Remindly

Remindly is a single-user, offline-first Android habit and task reminder app built with Expo, React Native, and TypeScript. Items, settings, and completion history live in a local SQLite database. The app has no login, backend, analytics service, or runtime network dependency.

## Run the app

1. Install Node.js and Android Studio.
2. In Android Studio, open **SDK Manager** and install an Android SDK Platform, Android SDK Build-Tools, and Platform-Tools. Android Studio's bundled Java runtime is usable as `JAVA_HOME`.
3. From this folder, run `npm install`, then `npx expo start` for Metro or `npx expo run:android` to build/install a development app.

Expo SDK 58 and compatible native packages are pinned in `package.json` and `package-lock.json`.

## Build an installable APK

### Local Android build

After the SDK and Java are configured, run:

```powershell
npx expo prebuild --platform android
cd android
.\gradlew.bat assembleRelease
```

The APK is written to `android\app\build\outputs\apk\release\app-release.apk`.

### EAS Build

Sign in to an Expo account, then configure and build the `preview` profile:

```powershell
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest build --platform android --profile preview
```

The `preview` profile is configured for APK output. EAS Build uploads the selected source project to Expo's build service; the installed app itself remains fully local/offline.

## Checks

```powershell
npm run typecheck
npm test
npm run lint
```

## Reminder behavior and Android notes

The scheduler uses a 24-hour rolling window and reserves at most 450 pending local notifications per refresh. It groups items due at the same instant. If the safety budget is exceeded, the Settings screen reports how many later notifications were omitted until the next refresh. The app refreshes on launch, app foreground, item/settings/completion changes, and a best-effort background task. Expo Notifications adds Android boot handling for scheduled local notifications.

On first launch, allow notifications and Android exact alarms, then review battery optimization for Remindly. Android and device vendors can still defer alarms in power-saving modes; short intervals in particular should be verified on the target phone. Background task timing is controlled by Android and is not an exact timer. Existing scheduled notifications remain local and do not require internet access.
