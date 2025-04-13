import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
  SafeAreaView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { IconSymbol } from "@/components/ui/IconSymbol";
import { useAppContext } from "@/contexts/AppContext";
import { Constants } from "@/constants/Constants";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeColor } from "@/hooks/useThemeColor";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";
import { TOKEN_STORAGE_KEY } from "@/utils/api";

interface WebPreviewSettingsProps {
  visible: boolean;
  onClose: () => void;
}

interface WebCommandStatus {
  running: boolean;
  command: string;
  pid: number | null;
  start_time: number | null;
  exit_code: number | null;
  output: string[];
  error: string | null;
  output_lines: number;
}

export function WebPreviewSettings({ visible, onClose }: WebPreviewSettingsProps) {
  const { 
    hostname, 
    port, 
    webCommand, 
    setWebCommand, 
    currentDirectory 
  } = useAppContext();
  
  const [status, setStatus] = useState<WebCommandStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [isStopping, setIsStopping] = useState<boolean>(false);
  const [isRestarting, setIsRestarting] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [commandInput, setCommandInput] = useState(webCommand);
  
  const tintColor = useThemeColor({}, "tint");
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const borderColor = useThemeColor({}, "border");
  const placeholderColor = useThemeColor({}, "placeholder");
  const inputBackgroundColor = useThemeColor({}, "inputBackground");
  const cardBackgroundColor = useThemeColor({}, "card");

  // Calculate the directory where the server should run
  const getServerDirectory = () => {
    // If the current directory contains claude-next-app, use it directly
    if (currentDirectory?.includes('claude-next-app')) {
      return currentDirectory;
    } 
    // Otherwise use the root project directory + claude-next-app
    else if (currentDirectory) {
      // Extract the project root - go up to the claude-code-go root if possible
      const parts = currentDirectory.split('/');
      const claudeCodeGoIndex = parts.findIndex(part => part === 'claude-code-go');
      
      if (claudeCodeGoIndex >= 0) {
        // Rebuild the path up to claude-code-go and add claude-next-app
        const rootPath = parts.slice(0, claudeCodeGoIndex + 1).join('/');
        return `${rootPath}/claude-next-app`;
      } else {
        // Fallback - try to use current dir + claude-next-app
        return `${currentDirectory}/claude-next-app`;
      }
    } else {
      // No current directory set, use a reasonable default
      return '/Users/sclay/projects/claude-code-go/claude-next-app';
    }
  };

  // Load initial status when modal becomes visible
  useEffect(() => {
    if (visible) {
      setCommandInput(webCommand);
      fetchStatusWithLoading();
      fetchLogsWithLoading();
    }
  }, [visible, webCommand]);

  // Set up polling for status and logs when modal is visible
  useEffect(() => {
    if (!visible) return;

    // Initial fetch
    fetchStatusSilently();
    fetchLogsSilently();

    // Set up polling
    const statusInterval = setInterval(fetchStatusSilently, 3000);
    const logsInterval = setInterval(fetchLogsSilently, 3000);

    return () => {
      clearInterval(statusInterval);
      clearInterval(logsInterval);
    };
  }, [visible]);

  // Fetch status with loading indicator (for initial/manual refresh)
  const fetchStatusWithLoading = async () => {
    try {
      setLoading(true);
      await fetchStatusInternal();
    } finally {
      setLoading(false);
    }
  };

  // Fetch status without loading indicator (for background updates)
  const fetchStatusSilently = async () => {
    try {
      await fetchStatusInternal();
    } catch (error) {
      console.error("Failed to fetch web command status silently:", error);
    }
  };

  // Internal status fetching function
  const fetchStatusInternal = async () => {
    // Get auth token
    const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);

    const response = await fetch(
      `http://${hostname}:${Constants.serverPort}/web-command`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer: ${token}` : "",
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      setStatus(data);
    }

    return response;
  };

  const startCommand = async () => {
    try {
      setIsStarting(true);
      const serverDirectory = getServerDirectory();

      // Get auth token
      const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);

      console.log('Starting server with:', {
        command: commandInput,
        directory: serverDirectory,
      });

      const response = await fetch(
        `http://${hostname}:${Constants.serverPort}/web-command/start`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "Authorization": token ? `Bearer: ${token}` : "",
          },
          body: JSON.stringify({ command: commandInput, directory: serverDirectory }),
        }
      );

      if (response.ok) {
        // Save the command if it works
        if (commandInput !== webCommand) {
          setWebCommand(commandInput);
        }
        
        await fetchStatusWithLoading();
        await fetchLogsWithLoading();
      }
    } catch (error) {
      console.error("Failed to start web command:", error);
    } finally {
      setIsStarting(false);
    }
  };

  const stopCommand = async () => {
    try {
      setIsStopping(true);

      // Get auth token
      const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);

      const response = await fetch(
        `http://${hostname}:${Constants.serverPort}/web-command/stop`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "Authorization": token ? `Bearer: ${token}` : "",
          },
        }
      );

      if (response.ok) {
        await fetchStatusWithLoading();
        await fetchLogsWithLoading();
      }
    } catch (error) {
      console.error("Failed to stop web command:", error);
    } finally {
      setIsStopping(false);
    }
  };

  const restartCommand = async () => {
    try {
      setIsRestarting(true);
      const serverDirectory = getServerDirectory();

      // Get auth token
      const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);

      const response = await fetch(
        `http://${hostname}:${Constants.serverPort}/web-command/restart`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "Authorization": token ? `Bearer: ${token}` : "",
          },
          body: JSON.stringify({ command: commandInput, directory: serverDirectory }),
        }
      );

      if (response.ok) {
        // Save the command if it works
        if (commandInput !== webCommand) {
          setWebCommand(commandInput);
        }
        
        await fetchStatusWithLoading();
        await fetchLogsWithLoading();
      }
    } catch (error) {
      console.error("Failed to restart web command:", error);
    } finally {
      setIsRestarting(false);
    }
  };

  // Fetch logs with loading indicator
  const fetchLogsWithLoading = async () => {
    try {
      setIsLoading(true);
      await fetchLogsInternal();
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch logs without loading indicator (for background updates)
  const fetchLogsSilently = async () => {
    try {
      await fetchLogsInternal();
    } catch (error) {
      console.error("Failed to fetch web command logs silently:", error);
    }
  };

  // Internal function to fetch logs
  const fetchLogsInternal = async () => {
    // Get auth token
    const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);

    const response = await fetch(
      `http://${hostname}:${Constants.serverPort}/web-command/logs?max=50`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer: ${token}` : "",
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      setLogs(data.logs || []);
    }

    return response;
  };

  const serverDirectory = getServerDirectory();

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidingView}
        >
          <ThemedView style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>Web Preview Settings</ThemedText>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <IconSymbol 
                name="xmark" 
                size={24} 
                color={textColor} 
              />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={[styles.scrollContainer, { backgroundColor }]}
            contentContainerStyle={styles.contentContainer}
          >
            {/* Server Information Section */}
            <ThemedView style={[styles.sectionContainer, { backgroundColor: cardBackgroundColor }]}>
              <ThemedText style={styles.sectionTitle}>Server Information</ThemedText>
              
              <View style={styles.infoRow}>
                <ThemedText style={styles.infoLabel}>Status:</ThemedText>
                <View style={styles.statusDisplay}>
                  {loading ? (
                    <ActivityIndicator size="small" color={tintColor} style={{ marginRight: 6 }} />
                  ) : (
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor: status?.running
                            ? "#4CAF50"
                            : "#F44336",
                        },
                      ]}
                    />
                  )}
                  <ThemedText>
                    {loading
                      ? "Checking..."
                      : status?.running
                      ? "Running"
                      : "Stopped"}
                  </ThemedText>
                </View>
              </View>

              <View style={styles.infoRow}>
                <ThemedText style={styles.infoLabel}>URL:</ThemedText>
                <ThemedText style={styles.infoValue}>{`http://${hostname}:${port}`}</ThemedText>
              </View>

              <View style={styles.infoRow}>
                <ThemedText style={styles.infoLabel}>Directory:</ThemedText>
                <ThemedText style={styles.infoValue}>{serverDirectory}</ThemedText>
              </View>

              {status?.running && (
                <View style={styles.infoRow}>
                  <ThemedText style={styles.infoLabel}>PID:</ThemedText>
                  <ThemedText style={styles.infoValue}>{status.pid}</ThemedText>
                </View>
              )}
            </ThemedView>

            {/* Server Control Section */}
            <ThemedView style={[styles.sectionContainer, { backgroundColor: cardBackgroundColor }]}>
              <ThemedText style={styles.sectionTitle}>Server Control</ThemedText>
              
              <View style={styles.commandInputContainer}>
                <ThemedText style={styles.inputLabel}>Command:</ThemedText>
                <TextInput
                  style={[
                    styles.commandInput,
                    {
                      backgroundColor: inputBackgroundColor,
                      color: textColor,
                      borderColor,
                    },
                  ]}
                  placeholder="npm run dev"
                  placeholderTextColor={placeholderColor}
                  value={commandInput}
                  onChangeText={setCommandInput}
                />
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.startButton,
                    (isStarting || status?.running) && styles.buttonDisabled,
                  ]}
                  onPress={startCommand}
                  disabled={isStarting || status?.running}
                >
                  {isStarting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <IconSymbol name="play.fill" size={12} color="#fff" />
                      <ThemedText style={styles.buttonText}>Start</ThemedText>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.stopButton,
                    (isStopping || !status?.running) && styles.buttonDisabled,
                  ]}
                  onPress={stopCommand}
                  disabled={isStopping || !status?.running}
                >
                  {isStopping ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <IconSymbol name="stop.fill" size={12} color="#fff" />
                      <ThemedText style={styles.buttonText}>Stop</ThemedText>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.restartButton,
                    isRestarting && styles.buttonDisabled,
                  ]}
                  onPress={restartCommand}
                  disabled={isRestarting}
                >
                  {isRestarting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <IconSymbol name="arrow.clockwise" size={12} color="#fff" />
                      <ThemedText style={styles.buttonText}>Restart</ThemedText>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ThemedView>

            {/* Server Logs Section */}
            <ThemedView style={[styles.sectionContainer, { backgroundColor: cardBackgroundColor }]}>
              <View style={styles.logsHeader}>
                <ThemedText style={styles.sectionTitle}>Server Logs</ThemedText>
                <TouchableOpacity
                  style={styles.refreshButton}
                  onPress={fetchLogsWithLoading}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color={tintColor} />
                  ) : (
                    <IconSymbol
                      name="arrow.clockwise"
                      size={16}
                      color={tintColor}
                    />
                  )}
                </TouchableOpacity>
              </View>

              <ThemedView
                style={[
                  styles.logsContainer,
                  {
                    backgroundColor: inputBackgroundColor,
                    borderColor,
                  },
                ]}
              >
                <ScrollView style={styles.logsScrollView}>
                  {logs.length > 0 ? (
                    logs.map((log, index) => (
                      <ThemedText
                        key={index}
                        style={[
                          styles.logLine,
                          log.includes("ERROR") && styles.errorLog,
                        ]}
                      >
                        {log}
                      </ThemedText>
                    ))
                  ) : (
                    <ThemedText style={styles.noLogsText}>
                      No logs available
                    </ThemedText>
                  )}
                </ScrollView>
              </ThemedView>
            </ThemedView>
          </ScrollView>

          {/* Footer with action buttons */}
          <View style={styles.footer}>
            <TouchableOpacity 
              style={styles.closeButtonFull}
              onPress={onClose}
            >
              <ThemedText style={styles.closeButtonText}>Close</ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: "center",
  },
  modalContent: {
    flex: 1,
    margin: 20,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    // Add max height to account for notches
    maxHeight: '85%',
    alignSelf: 'center',
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  closeButton: {
    padding: 4,
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 16,
  },
  sectionContainer: {
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 14,
    flex: 1,
    textAlign: "right",
    paddingLeft: 8,
  },
  statusDisplay: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  commandInputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 6,
  },
  commandInput: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  actionButton: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  startButton: {
    backgroundColor: "#4CAF50",
  },
  stopButton: {
    backgroundColor: "#F44336",
  },
  restartButton: {
    backgroundColor: "#2196F3",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  logsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  refreshButton: {
    padding: 4,
  },
  logsContainer: {
    borderWidth: 1,
    borderRadius: 8,
    height: 200,
  },
  logsScrollView: {
    padding: 10,
  },
  logLine: {
    fontSize: 12,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    marginBottom: 2,
  },
  errorLog: {
    color: "#F44336",
  },
  noLogsText: {
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 10,
    opacity: 0.7,
  },
  footer: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  closeButtonFull: {
    backgroundColor: "#2196F3",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  closeButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});