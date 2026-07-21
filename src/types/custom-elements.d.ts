import React from "react";

declare global {
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        'iconify-icon': {
          icon?: string;
          style?: any;
          class?: string;
          className?: string;
        };
      }
    }
  }
}
