import { PropsWithChildren, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useAppContext } from '@/contexts/AppContext';
import { useThemeColor } from '@/hooks/useThemeColor';

export function Collapsible({ children, title }: PropsWithChildren & { title: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const { setIsTogglingCollapsible } = useAppContext();
  const tintColor = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');

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
            name={isOpen ? "xmark" : "chevron.right"}
            size={12}
            weight="medium"
            color={textColor}
            style={isOpen ? {} : { transform: [{ rotate: '0deg' }] }}
          />

          <ThemedText style={[styles.title, { color: tintColor }]}>{title}</ThemedText>
        </View>
        {isOpen ? (
          <ThemedView style={styles.content}>{children}</ThemedView>
        ) : null}
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
  preview: {
    marginLeft: 18,
    fontSize: 12,
    fontStyle: 'italic',
    opacity: 0.6,
    marginTop: 2,
  },
  content: {
    marginTop: 6,
    backgroundColor: 'transparent',
    width: '100%',
  },
});
