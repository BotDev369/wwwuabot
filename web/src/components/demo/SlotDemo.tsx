interface SlotDemoProps {
  label: string;
}

export function SlotDemo({ label }: SlotDemoProps) {
  return <div style={{ border: "2px dashed #ccc", padding: "20px", margin: "10px" }}>{label}</div>;
}
