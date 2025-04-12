import { useState, useEffect } from "react";
import Voice, {
  SpeechResultsEvent,
  SpeechErrorEvent,
} from "@react-native-voice/voice";
import { Platform, PermissionsAndroid } from "react-native";

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [speechText, setSpeechText] = useState("");
  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        if (Platform.OS === "android") {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
            {
              title: "Microphone Permission",
              message:
                "Claude Code Go needs access to your microphone to transcribe speech",
              buttonNeutral: "Ask Me Later",
              buttonNegative: "Cancel",
              buttonPositive: "OK",
            }
          );
          setHasPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
        } else {
          // iOS will handle permissions via the native prompt
          setHasPermission(true);
        }
      } catch (err) {
        setError("Permission check failed");
        console.error("Permission check error:", err);
      }
    };

    // Initialize Voice library
    const initializeVoice = async () => {
      try {
        // Always destroy any existing instance first
        await Voice.destroy();
        await Voice.removeAllListeners();

        // Platform-specific setup
        if (Platform.OS === "android") {
          console.log("Platform-specific handling for Android");
          // Android requires specific initialization (nothing extra for now)
        } else if (Platform.OS === "ios") {
          console.log("Platform-specific handling for iOS");
          // iOS-specific setup if needed
        }

        Voice.onSpeechStart = () => {
          console.log("Speech started");
        };

        Voice.onSpeechEnd = () => {
          console.log("Speech ended");
          setIsListening(false);
        };

        Voice.onSpeechResults = (e: SpeechResultsEvent) => {
          console.log("Speech results received", Platform.OS, e.value);
          if (e.value && e.value.length > 0) {
            setSpeechText(e.value[0]);
          }
        };

        Voice.onSpeechError = (e: SpeechErrorEvent) => {
          console.error("Speech error:", e);
          const errorMessage =
            Platform.OS === "android"
              ? `Error code: ${e.error?.code}`
              : e.error?.message || "Unknown error";
          setError(`Speech recognition error: ${errorMessage}`);
          setIsListening(false);
        };

        setIsInitialized(true);
      } catch (err) {
        console.error("Voice initialization error:", err);
        setError("Failed to initialize speech recognition");
      }
    };

    checkPermissions();
    initializeVoice();

    // Clean up listeners when component unmounts
    return () => {
      if (isListening) {
        stopListening();
      }
      Voice.destroy()
        .then(() => {
          console.log("Voice instance destroyed");
        })
        .catch((e) => {
          console.error("Error destroying Voice instance:", e);
        });
    };
  }, []);

  const startListening = async () => {
    try {
      if (!isInitialized) {
        setError("Speech recognition not initialized yet");
        return;
      }

      if (!hasPermission) {
        if (Platform.OS === "android") {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            setError("Microphone permission denied");
            return;
          }
          setHasPermission(true);
        } else {
          setError("Microphone permission not granted");
          return;
        }
      }

      setSpeechText("");
      setError(null);

      // Make sure we're not already listening
      if (isListening) {
        await Voice.stop();
      }

      // Different options based on platform
      if (Platform.OS === "android") {
        console.log("Starting Android voice recognition");
        try {
          await Voice.start("en-US", {
            EXTRA_LANGUAGE_MODEL: "LANGUAGE_MODEL_FREE_FORM",
            EXTRA_MAX_RESULTS: 5,
            EXTRA_PARTIAL_RESULTS: true,
            EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 500,
            EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 1500,
            EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 1000,
          });
          setIsListening(true);
        } catch (err) {
          console.error("Android voice recognition error:", err);
          setError(`Android voice error: ${err}`);
        }
      } else {
        console.log("Starting iOS voice recognition");
        await Voice.start("en-US");
        setIsListening(true);
      }
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      setError("Failed to start speech recognition");
      setIsListening(false);
    }
  };

  const stopListening = async () => {
    try {
      if (!isInitialized) {
        return;
      }

      console.log(`Stopping ${Platform.OS} voice recognition`);
      await Voice.stop();
      setIsListening(false);
    } catch (err) {
      console.error("Error stopping speech recognition:", err);
    }
  };

  const toggleListening = async () => {
    if (isListening) {
      await stopListening();
    } else {
      await startListening();
    }
  };

  return {
    isListening,
    speechText,
    hasPermission,
    error,
    startListening,
    stopListening,
    toggleListening,
  };
};
