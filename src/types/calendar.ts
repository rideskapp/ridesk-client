import React from 'react';

/**
 * Custom CSS properties for lesson cards with responsive heights
 */
export interface LessonCardStyle extends React.CSSProperties {
  '--desktop-height'?: string;
  '--desktop-top'?: string;
}
