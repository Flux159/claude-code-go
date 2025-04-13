// Validation script for voice recognition
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

console.log("🎤 Voice Recognition Validation Script");
console.log("=====================================");

// Check if @react-native-voice/voice is installed
try {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8")
  );

  console.log("\n📋 Checking dependencies...");

  const voicePackage = packageJson.dependencies["@react-native-voice/voice"];
  if (voicePackage) {
    console.log(
      "✅ @react-native-voice/voice found in package.json:",
      voicePackage
    );
  } else {
    console.log("❌ @react-native-voice/voice not found in package.json");
    console.log("   Run: npx expo install @react-native-voice/voice");
  }

  const speechRecognition = packageJson.dependencies["expo-speech-recognition"];
  if (speechRecognition) {
    console.log(
      "✅ expo-speech-recognition found in package.json:",
      speechRecognition
    );
  } else {
    console.log("❌ expo-speech-recognition not found in package.json");
    console.log("   Run: npx expo install expo-speech-recognition");
  }

  // Check app.json for voice-related configuration
  console.log("\n📋 Checking app.json configuration...");
  const appJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "app.json"), "utf8")
  );

  // Check Android permissions
  const androidPermissions = appJson.expo.android?.permissions || [];
  if (androidPermissions.includes("RECORD_AUDIO")) {
    console.log("✅ RECORD_AUDIO permission found in app.json");
  } else {
    console.log("❌ RECORD_AUDIO permission not found in app.json");
  }

  // Check plugins
  const plugins = appJson.expo.plugins || [];
  let hasVoicePlugin = false;
  let hasSpeechRecognitionPlugin = false;

  for (const plugin of plugins) {
    if (typeof plugin === "string" && plugin === "@react-native-voice/voice") {
      hasVoicePlugin = true;
    } else if (
      Array.isArray(plugin) &&
      plugin[0] === "expo-speech-recognition"
    ) {
      hasSpeechRecognitionPlugin = true;
    }
  }

  if (hasVoicePlugin) {
    console.log("✅ @react-native-voice/voice plugin found in app.json");
  } else {
    console.log("❌ @react-native-voice/voice plugin not found in app.json");
  }

  if (hasSpeechRecognitionPlugin) {
    console.log("✅ expo-speech-recognition plugin found in app.json");
  } else {
    console.log("❌ expo-speech-recognition plugin not found in app.json");
  }

  // Check if the Voice hook is properly implemented
  console.log("\n📋 Checking hook implementation...");
  if (
    fs.existsSync(
      path.join(__dirname, "..", "hooks", "useSpeechRecognition.ts")
    )
  ) {
    console.log("✅ useSpeechRecognition hook found");

    const hookContent = fs.readFileSync(
      path.join(__dirname, "..", "hooks", "useSpeechRecognition.ts"),
      "utf8"
    );

    if (hookContent.includes("PermissionsAndroid.request")) {
      console.log("✅ Android permission handling found in hook");
    } else {
      console.log("❌ Android permission handling missing in hook");
    }

    if (hookContent.includes("Platform.OS === 'android'")) {
      console.log("✅ Platform-specific code found in hook");
    } else {
      console.log("❌ Platform-specific handling missing in hook");
    }
  } else {
    console.log("❌ useSpeechRecognition hook not found");
  }

  console.log("\n📋 Next steps:");
  console.log("1. Rebuild your app with: npx expo prebuild --clean");
  console.log("2. Run on Android with: npx expo run:android");
  console.log(
    "3. If issues persist, check Android device logs with: adb logcat"
  );
} catch (error) {
  console.error("Error during validation:", error);
}
