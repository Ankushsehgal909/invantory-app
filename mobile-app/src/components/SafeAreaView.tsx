import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import {
  SafeAreaView as RNSafeAreaView,
  Edges,
} from 'react-native-safe-area-context';

interface SafeAreaViewProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  edges?: Edges;
}

export function SafeAreaView({
  children,
  style,
  edges = ['top', 'left', 'right'],
}: SafeAreaViewProps) {
  const Component = RNSafeAreaView as React.ComponentType<any>;
  return (
    <Component style={style} edges={edges}>
      {children}
    </Component>
  );
}
