import React, { useRef } from 'react';
import { Camera, Image as ImageIcon, X } from 'lucide-react';

interface ImageUploadProps {
  label: string;
  imageData: string | null;
  onImageChange: (data: string | null, fileName?: string) => void;
  existingFileNames?: string[]; // To check for duplicates
}

// Utility to resize image
const resizeImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        // Reduced max size to 800px to prevent memory crashes on mobile
        const MAX_SIZE = 800; 

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            // Compress to JPEG at 0.6 quality for smaller footprint
            resolve(canvas.toDataURL('image/jpeg', 0.6));
        } else {
            reject(new Error("Canvas context not available"));
        }
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const ImageUpload: React.FC<ImageUploadProps> = ({ 
  label, 
  imageData, 
  onImageChange,
  existingFileNames = []
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Duplicate Check Logic
      const fileName = file.name;
      
      const lastDotIndex = fileName.lastIndexOf('.');
      const nameBody = lastDotIndex !== -1 ? fileName.substring(0, lastDotIndex) : fileName;
      const ext = lastDotIndex !== -1 ? fileName.substring(lastDotIndex) : '';

      const rootNameRegex = /^(.*?)(?:\s?\(\d+\))?$/;
      const match = nameBody.match(rootNameRegex);
      const rootName = match ? match[1] : nameBody;

      const isDuplicate = existingFileNames.some(existing => {
        if (existing === fileName) return true;
        
        const exLastDot = existing.lastIndexOf('.');
        const exBody = exLastDot !== -1 ? existing.substring(0, exLastDot) : existing;
        const exExt = exLastDot !== -1 ? existing.substring(exLastDot) : '';

        if (exExt.toLowerCase() !== ext.toLowerCase()) return false;

        const exMatch = exBody.match(rootNameRegex);
        const exRoot = exMatch ? exMatch[1] : exBody;

        return rootName === exRoot;
      });

      if (isDuplicate) {
        alert('<첨부한 사진과 다른 사진을 추가해 주시기 바랍니다>');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      try {
        // Small timeout to allow UI to update if needed
        setTimeout(async () => {
            try {
                const resizedData = await resizeImage(file);
                onImageChange(resizedData, fileName);
            } catch (error) {
                console.error("Image processing failed", error);
                alert("사진 처리 중 오류가 발생했습니다.");
            }
        }, 10);
      } catch (error) {
        console.error("Image upload setup failed", error);
      }
    }
  };

  const clearImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    onImageChange(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="mb-4 border border-gray-300 rounded-md overflow-hidden shadow-sm">
      <div className="bg-gray-200 px-4 py-2 font-bold text-gray-700 text-sm border-b border-gray-300 flex justify-between items-center">
        <span>{label}</span>
        {imageData && (
          <button onClick={clearImage} className="text-red-500 text-xs flex items-center bg-white px-2 py-1 rounded">
            <X size={12} className="mr-1" /> 삭제
          </button>
        )}
      </div>
      <div 
        className="bg-white p-4 flex justify-center items-center cursor-pointer min-h-[150px]"
        onClick={() => fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          accept="image/*" 
          ref={fileInputRef} 
          className="hidden" 
          onChange={handleFileChange}
        />
        {imageData ? (
          <img src={imageData} alt="Uploaded" className="max-h-[200px] w-auto object-contain rounded" />
        ) : (
          <div className="text-center text-gray-400">
            <div className="flex justify-center mb-2">
              <Camera size={32} />
            </div>
            <p className="text-sm">클릭하여 사진 추가</p>
          </div>
        )}
      </div>
    </div>
  );
};