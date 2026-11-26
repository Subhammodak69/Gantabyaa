import React from 'react';
import {
  ScrollView as NativeScrollView,
  type ScrollViewInstance,
  type ScrollViewProps,
} from 'react-native';

export const ScrollView = React.forwardRef<ScrollViewInstance, ScrollViewProps>(
  (props, ref) => (
    <NativeScrollView
      {...props}
      ref={ref}
      showsHorizontalScrollIndicator={false}
    />
  ),
);

ScrollView.displayName = 'ScrollView';
