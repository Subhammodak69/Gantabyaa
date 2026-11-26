import React from 'react';
import {
  ScrollView as NativeScrollView,
  type ScrollViewProps,
} from 'react-native';

export const ScrollView = React.forwardRef<NativeScrollView, ScrollViewProps>(
  (props, ref) => (
    <NativeScrollView
      {...props}
      ref={ref}
      showsHorizontalScrollIndicator={false}
    />
  ),
);

ScrollView.displayName = 'ScrollView';
