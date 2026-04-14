import { useEffect, useMemo, useRef } from 'react';

interface Props {
  images: File[];
  onChange: (files: File[]) => void;
}

export default function ImageUploader({ images, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previews = useMemo(() => images.map((file) => URL.createObjectURL(file)), [images]);

  useEffect(() => {
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previews]);

  const handleAdd = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    const remaining = 3 - images.length;
    onChange([...images, ...files.slice(0, remaining)]);

    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleRemove = (index: number) => {
    onChange(images.filter((_, itemIndex) => itemIndex !== index));
  };

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-900">Images</p>
          <p className="text-xs text-slate-500">Upload up to 3 photos. The first image becomes the cover.</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">
          {images.length}/3
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 min-[480px]:grid-cols-3">
        {previews.map((src, index) => (
          <div key={src} className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <img src={src} alt={`Preview ${index + 1}`} className="h-32 w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-slate-900/75 to-transparent p-3">
              <span className="text-xs font-medium text-white">{index === 0 ? 'Cover' : `Image ${index + 1}`}</span>
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-slate-700"
              >
                Remove
              </button>
            </div>
          </div>
        ))}

        {images.length < 3 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-32 flex-col items-center justify-center rounded-2xl border border-dashed border-sky-300 bg-sky-50 text-center text-sm font-medium text-sky-700 transition hover:border-sky-400 hover:bg-sky-100"
          >
            <span className="text-2xl leading-none">+</span>
            <span>Add photo</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleAdd}
        className="hidden"
      />
    </div>
  );
}
