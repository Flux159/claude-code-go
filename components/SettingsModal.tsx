import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { IconSymbol } from '@/components/ui/IconSymbol';
import { ThemePreference, useAppContext } from '@/contexts/AppContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useThemeColor } from '@/hooks/useThemeColor';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

// Theme selector component for settings modal
function ThemeSelector() {
  const { themePreference, setThemePreference } = useAppContext();
  const colorScheme = useColorScheme();
  const tintColor = useThemeColor({}, 'tint');
  
  // Get appropriate icon and active status for each theme option
  const getThemeOption = (theme: ThemePreference) => {
    let iconName: any;
    let label: string;
    let isActive: boolean;
    
    switch(theme) {
      case 'light':
        iconName = 'sun.max.fill';
        label = 'Light';
        isActive = themePreference === 'light';
        break;
      case 'dark':
        iconName = 'moon.fill';
        label = 'Dark';
        isActive = themePreference === 'dark';
        break;
      case 'auto':
        iconName = 'circle.bottomhalf.filled';
        label = 'Auto';
        isActive = themePreference === 'auto';
        break;
    }
    
    return { iconName, label, isActive };
  };

  return (
    <View style={styles.themeSection}>
      <ThemedText style={styles.themeSectionTitle}>Theme</ThemedText>
      <View style={styles.themeOptions}>
        {(['light', 'dark', 'auto'] as ThemePreference[]).map(theme => {
          const { iconName, label, isActive } = getThemeOption(theme);
          return (
            <TouchableOpacity
              key={theme}
              style={[
                styles.themeButton,
                isActive && styles.activeThemeButton
              ]}
              onPress={() => setThemePreference(theme)}
            >
              <IconSymbol
                name={iconName}
                size={24}
                color={isActive ? tintColor : '#999'}
              />
              <ThemedText style={[
                styles.themeButtonLabel,
                isActive && {color: tintColor}
              ]}>
                {label}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const { hostname, setHostname, port, setPort } = useAppContext();
  const [hostnameValue, setHostnameValue] = useState(hostname);
  const [portValue, setPortValue] = useState(port.toString());
  const [portError, setPortError] = useState('');
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');

  useEffect(() => {
    if (visible) {
      setHostnameValue(hostname);
      setPortValue(port.toString());
      setPortError('');
    }
  }, [visible, hostname, port]);

  const handleSave = () => {
    // Validate port
    const portNum = parseInt(portValue, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      setPortError('Port must be a number between 1 and 65535');
      return;
    }

    setHostname(hostnameValue);
    setPort(portNum);
    onClose();
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.centeredView}
      >
        <ThemedView style={styles.modalView}>
          <ThemedText type="subtitle" style={styles.modalTitle}>
            Settings
          </ThemedText>

          <View style={styles.inputContainer}>
            <ThemedText>Hostname</ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor,
                  color: textColor,
                  borderColor: Platform.OS === 'ios' ? '#cccccc80' : 'transparent',
                  borderWidth: StyleSheet.hairlineWidth,
                },
              ]}
              value={hostnameValue}
              onChangeText={setHostnameValue}
              placeholder="macbook.local"
              placeholderTextColor="#999"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <ThemedText>Port</ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor,
                  color: textColor,
                  borderColor: Platform.OS === 'ios' ? '#cccccc80' : 'transparent',
                  borderWidth: StyleSheet.hairlineWidth,
                },
              ]}
              value={portValue}
              onChangeText={(text) => {
                setPortValue(text);
                setPortError('');
              }}
              placeholder="3000"
              placeholderTextColor="#999"
              keyboardType="numeric"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {portError ? <ThemedText style={styles.errorText}>{portError}</ThemedText> : null}
          </View>
          
          {/* Theme selector */}
          <ThemeSelector />

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button} onPress={onClose}>
              <ThemedText>Cancel</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSave}
            >
              <ThemedText style={styles.saveButtonText}>Save</ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    width: '85%',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    height: 40,
    marginTop: 8,
    padding: 10,
    borderRadius: 5,
  },
  // Theme selector styles
  themeSection: {
    marginBottom: 20,
  },
  themeSectionTitle: {
    marginBottom: 12,
  },
  themeOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  themeButton: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
  },
  activeThemeButton: {
    backgroundColor: 'rgba(200, 200, 200, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.2)',
  },
  themeButtonLabel: {
    marginTop: 6,
    fontSize: 12,
  },
  // Button container styles
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 10,
  },
  button: {
    flex: 1,
    borderRadius: 5,
    padding: 10,
    elevation: 2,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    color: 'white',
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 4,
  },
});
