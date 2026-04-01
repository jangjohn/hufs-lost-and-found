import { useState, useRef, useEffect } from 'react';

interface Props {
  images: File[];
  onChange: (files: File[]) => void;
}

export default function ImageUploader({ images, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);

  // 컴포넌트 언마운트 시 모든 ObjectURL 정리
  useEffect(() => {
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previews]);

  const handleAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const remaining = 3 - images.length;
    const toAdd = files.slice(0, remaining);

    const newImages = [...images, ...toAdd];
    onChange(newImages);

    const newPreviews = toAdd.map((f) => URL.createObjectURL(f));
    setPreviews((prev) => [...prev, ...newPreviews]);

    if (inputRef.current) inputRef.current.value = '';
  };

  const handleRemove = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    onChange(images.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div className="flex gap-2 flex-wrap">
        {previews.map((src, i) => (
          <div key={i} className="relative w-24 h-24">
            <img src={src} alt="" className="w-full h-full object-cover rounded-md" />
            <button
              type="button"
              onClick={() => handleRemove(i)}
              className="absolute -top-1 -right-1 bg-red-500 text-white w-5 h-5 rounded-full text-xs flex items-center justify-center"
            >
              x
            </button>
          </div>
        ))}
      </div>
      {images.length < 3 && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-2 text-sm text-blue-600 hover:underline"
        >
          사진 추가 ({images.length}/3)
        </button>
      )}
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
