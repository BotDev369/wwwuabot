import { SlotDemo } from '../demo/SlotDemo';

interface SlotRendererProps {
  component: string;
  props?: any;
}

export function SlotRenderer({ component, props }: SlotRendererProps) {
  switch (component) {
    case 'SlotDemo':
      return <SlotDemo {...props} />;
    default:
      return <div>Unknown component: {component}</div>;
  }
}
