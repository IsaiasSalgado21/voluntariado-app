import { forwardRef } from 'react';
import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import {
  Pressable,
  View,
  StyleSheet,
  type PressableInstance,
  type ViewInstance,
  useWindowDimensions,
} from 'react-native';

import { MaxContentWidth, Spacing } from '@/constants/theme';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="index" href="/" asChild>
            <TabButton>Mapa</TabButton>
          </TabTrigger>
          <TabTrigger name="voluntariados" href="/voluntariados" asChild>
            <TabButton>Voluntariados</TabButton>
          </TabTrigger>
          <TabTrigger name="flora-fauna" href="/flora-fauna" asChild>
            <TabButton>Naturaleza</TabButton>
          </TabTrigger>
          <TabTrigger name="mas" href="/mas" asChild>
            <TabButton>Más</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export const TabButton = forwardRef<
  PressableInstance,
  Omit<TabTriggerSlotProps, 'ref'>
>(function TabButton({ children, isFocused, ...props }, ref) {
  return (
    <Pressable
      {...props}
      ref={ref}
      style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView
        type={isFocused ? 'backgroundSelected' : 'backgroundElement'}
        style={styles.tabButtonView}>
        <ThemedText type="small" themeColor={isFocused ? 'text' : 'textSecondary'}>
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
});

export const CustomTabList = forwardRef<ViewInstance, TabListProps>(
  function CustomTabList({ children, style, ...props }, ref) {
    const { width } = useWindowDimensions();

    return (
      <View {...props} ref={ref} style={[styles.tabListContainer, style]}>
        <ThemedView type="backgroundElement" style={styles.innerContainer}>
          {width >= 520 && (
            <ThemedText type="smallBold" style={styles.brandText}>
              REGENERA
            </ThemedText>
          )}
          {children}
        </ThemedView>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    width: '100%',
    padding: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.five,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    gap: Spacing.one,
    maxWidth: MaxContentWidth,
  },
  brandText: {
    marginRight: 'auto',
    marginLeft: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.three,
  },
});
