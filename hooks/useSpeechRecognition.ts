import { useState, useEffect, useRef } from "react";
import { Platform } from "react-native";
// No direct imports from expo-speech-recognition are needed

// Use expo-av for permissions
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from "expo-av";

// Define state for recording status
type RecordingStatus =
  | "idle"
  | "requestingPermission"
  | "checkingAvailability"
  | "ready"
  | "recording"
  | "stopped" // Recording finished, ready to process or start new
  | "processing" // Uploading/Transcribing
  | "error";

export const useSpeechRecognition = () => {
  const [status, setStatus] = useState<RecordingStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  // Use a ref for the recording instance to avoid potential state update races
  const recordingRef = useRef<Audio.Recording | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null); // URI of the completed recording
  const [transcribedText, setTranscribedText] = useState<string>(""); // Text from cloud STT
  const isMounted = useRef(true);

  useEffect(() => {
    // Cleanup function to set mounted status
    return () => {
      isMounted.current = false;
      // Stop and unload recording if active on unmount
      if (recordingRef.current) {
        console.log("Unloading recording instance on unmount...");
        recordingRef.current
          .stopAndUnloadAsync()
          .catch((e) =>
            console.error("Error unloading recording on unmount:", e)
          );
        recordingRef.current = null;
      }
    };
  }, []);

  // --- Check Permissions ---
  useEffect(() => {
    const checkPermissions = async () => {
      if (!isMounted.current) return;
      setStatus("requestingPermission");
      try {
        console.log("Requesting microphone permissions via expo-av...");
        const { status: permissionStatus } =
          await Audio.requestPermissionsAsync();
        if (!isMounted.current) return;
        if (permissionStatus === "granted") {
          setStatus("ready");
          setError(null);
          console.log("Microphone permission granted.");
          // Configure audio mode for recording (important for iOS)
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
            interruptionModeIOS: InterruptionModeIOS.DoNotMix,
            shouldDuckAndroid: true,
            interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
            playThroughEarpieceAndroid: false,
          });
        } else {
          console.warn("Microphone permission denied.");
          setError("Microphone permission denied.");
          setStatus("error");
        }
      } catch (err: any) {
        console.error("Error requesting microphone permissions:", err);
        if (isMounted.current) {
          setError(`Failed request permissions: ${err.message || err}`);
          setStatus("error");
        }
      }
    };

    checkPermissions();
  }, []); // Run only on mount

  // --- Action Functions ---
  const startRecording = async () => {
    // Allow starting only if ready or stopped (after processing/cancel)
    if (status !== "ready" && status !== "stopped") {
      console.log(`Cannot start recording in status: ${status}`);
      return;
    }

    // Ensure any lingering instance is unloaded (safety check)
    if (recordingRef.current) {
      console.warn(
        "Lingering recording instance found before start, unloading..."
      );
      await recordingRef.current
        .stopAndUnloadAsync()
        .catch((e) => console.error("Error unloading lingering instance:", e));
      recordingRef.current = null;
    }

    try {
      console.log("Starting audio recording...");
      setError(null);
      setRecordingUri(null);
      setTranscribedText("");
      setStatus("recording"); // Set status *before* async operation

      await Audio.setAudioModeAsync({
        // Re-affirm mode just in case
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        shouldDuckAndroid: true,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        playThroughEarpieceAndroid: false,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording; // Store instance in ref

      console.log("Recording started successfully");
    } catch (err: any) {
      console.error("Failed to start recording", err);
      if (isMounted.current) {
        setError(`Failed to start recording: ${err.message || err}`);
        setStatus("error");
        recordingRef.current = null; // Ensure ref is cleared on error
      }
    }
  };

  const stopRecordingAndProcess = async () => {
    // Check using the ref
    if (status !== "recording" || !recordingRef.current) {
      console.log(
        `Not recording or no instance, cannot stop. Status: ${status}`
      );
      return;
    }

    const recordingToProcess = recordingRef.current; // Capture ref value
    recordingRef.current = null; // Immediately nullify ref
    console.log("Stopping recording...");

    try {
      const uri = recordingToProcess.getURI();
      console.log("Attempting to stop and unload...");
      await recordingToProcess.stopAndUnloadAsync();
      console.log("Recording stopped and unloaded successfully.");

      if (!isMounted.current) return;

      if (!uri) {
        console.error("Recording URI is null after getting URI.");
        throw new Error("Recording URI is null after stopping.");
      }

      setRecordingUri(uri); // Keep the URI available if needed elsewhere
      setStatus("processing");
      setError(null);

      // --- !!! Cloud STT Integration Point !!! ---
      console.log("Audio recorded to:", uri);
      console.log(
        "--> NEXT STEP: Upload this file to a backend/cloud function which calls a Speech-to-Text API (e.g., Google, OpenAI Whisper, AssemblyAI). <---"
      );

      // Simulate delay and provide placeholder text indicating need for cloud API
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Shorter delay
      if (isMounted.current) {
        setTranscribedText("[Cloud STT needed for transcription] "); // Updated placeholder
        setStatus("stopped");
        console.log("Placeholder shown. Implement cloud STT call here.");
      }
      // --- End Integration Point ---
    } catch (err: any) {
      console.error("Failed to stop recording or process", err);
      if (isMounted.current) {
        setError(`Failed to stop/process recording: ${err.message || err}`);
        setStatus("error");
      }
    }
  };

  const cancelRecording = async () => {
    // Check ref directly
    if (!recordingRef.current) {
      console.log("Cancel ignored: No active recording instance found in ref.");
      return;
    }

    console.log("Cancelling recording via ref...");
    const recordingToCancel = recordingRef.current; // Capture instance
    recordingRef.current = null; // Nullify ref immediately

    try {
      await recordingToCancel.stopAndUnloadAsync();
      console.log("Recording cancelled and unloaded.");
    } catch (error) {
      console.error("Error cancelling recording:", error);
      // Don't set main error state for cancel error, just log
    }

    // Reset state after cancelling
    if (isMounted.current) {
      setStatus("stopped"); // Go to stopped state after cancel
      setError(null);
      setRecordingUri(null);
      setTranscribedText("");
    }
  };

  // Toggle function controls start/stop for the main button
  const toggleRecording = async () => {
    if (status === "recording") {
      await stopRecordingAndProcess();
    } else if (status === "ready" || status === "stopped") {
      await startRecording();
    } else {
      console.log(`Toggle ignored in status: ${status}`);
    }
  };

  return {
    status,
    error,
    toggleRecording,
    cancelRecording,
    transcribedText,
  };
};
