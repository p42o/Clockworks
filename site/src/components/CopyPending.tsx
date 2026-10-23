export default function CopyPending({ slot, note }: { slot: string; note?: string }) {
  return (
    <div data-copy-pending={slot} className="rounded-[3px] border-2 border-dashed border-copper bg-cream p-5 font-mono text-sm">
      <p>COPY PENDING (Sprocket): {slot}</p>
      {note && <p className="mt-3">{note}</p>}
    </div>
  );
}
