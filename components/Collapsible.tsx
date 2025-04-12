import { PropsWithChildren, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useAppContext } from '@/contexts/AppContext';
import { useColorScheme } from '@/hooks/useColorScheme';

export function Collapsible({ children, title }: PropsWithChildren & { title: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const theme = useColorScheme() ?? 'light';
  const { setIsTogglingCollapsible } = useAppContext();

  const handleToggle = () => {
    setIsTogglingCollapsible(true);
    setIsOpen((value) => !value);
    setTimeout(() => {
      setIsTogglingCollapsible(false);
    }, 300);
  };

  return (
    <TouchableOpacity
      onPress={handleToggle}
      activeOpacity={0.8}
      style={{ width: '100%' }}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
      <ThemedView style={styles.container}>
        <View style={styles.heading}>
          <IconSymbol
            name="chevron.right"
            size={12}
            weight="medium"
            color={theme === 'light' ? Colors.light.icon : Colors.dark.icon}
            style={{ transform: [{ rotate: isOpen ? '90deg' : '0deg' }] }}
          />

          <ThemedText style={styles.title}>{title}</ThemedText>
        </View>
        {isOpen && <ThemedView style={styles.content}>{children}</ThemedView>}
      </ThemedView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 8,
  },
  title: {
    fontSize: 14,
  },
  content: {
    marginTop: 6,
    marginLeft: 6,
    backgroundColor: 'transparent',
  },
});
