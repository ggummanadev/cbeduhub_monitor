import React, { useRef, useState, useEffect } from 'react';
import { Eraser, Check } from 'lucide-react';

interface SignaturePadProps {
  label: string;
  signatureData: string | null;
  onSave: (data: string | null) => void;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({ label, signatureData, onSave }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isEditing, setIsEditing] = useState(!signatureData);
  const [isSaved, setIsSaved] = useState(!!signatureData);
  const [hasDrawings, setHasDrawings] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    if (!signatureData) {
      setIsEditing(true);
      setIsSaved(false);
      setHasDrawings(false);
    } else {
      setIsSaved(true);
      setIsEditing(false);
    }
  }, [signatureData]);

  // Set up canvas context properties
  useEffect(() => {
    if (isEditing && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [isEditing]);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return null;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    let clientX: number;
    let clientY: number;

    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;
    
    return { x, y };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if ('touches' in e) {
      // Only prevent default on touch drawing to allow normal scrolling on background
      if (e.cancelable) e.preventDefault();
    }
    
    const coords = getCoordinates(e);
    if (!coords) return;

    setIsDrawing(true);
    setHasDrawings(true);
    setIsSaved(false);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    if ('touches' in e) {
      if (e.cancelable) e.preventDefault();
    }

    const coords = getCoordinates(e);
    if (!coords) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    setHasDrawings(false);
    setIsSaved(false);
    onSave(null);
  };

  const handleSave = () => {
    if (canvasRef.current && hasDrawings) {
      // Get the image data
      const dataUrl = canvasRef.current.toDataURL('image/png');
      onSave(dataUrl);
      setIsSaved(true);
    } else {
      alert("서명란에 이름을 정자로 적어주신 후 저장해주세요.");
    }
  };

  const startEditing = () => {
    setIsEditing(true);
    setIsSaved(false);
    setHasDrawings(false);
    onSave(null);
  };

  return (
    <div className="mb-5 border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white">
      {/* Header Bar */}
      <div className="bg-slate-50 px-4 py-3 font-bold text-slate-700 text-sm border-b border-slate-100 flex justify-between items-center">
        <span className="text-slate-800">{label}</span>
        {isEditing && (
          <span className="text-[11px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md animate-pulse">
            정자로 정확하게 적어주세요
          </span>
        )}
      </div>

      {/* Signature Canvas / Image Area */}
      <div className="bg-white p-4">
        {isEditing ? (
          <div className="border border-dashed border-slate-300 rounded-xl overflow-hidden bg-slate-50 h-[150px] relative">
            <canvas 
              ref={canvasRef}
              width={600}
              height={300}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full h-full cursor-crosshair touch-none"
            />
            {!hasDrawings && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs">
                여기에 손가락이나 펜으로 이름을 정자로 쓰세요.
              </div>
            )}
          </div>
        ) : (
          <div className="border border-slate-100 rounded-xl overflow-hidden bg-slate-50/50 h-[150px] flex items-center justify-center relative">
            {signatureData ? (
              <img src={signatureData} alt="서명 이미지" className="max-h-full max-w-full object-contain p-2" />
            ) : (
              <span className="text-slate-400 text-sm">등록된 서명이 없습니다.</span>
            )}
          </div>
        )}

        {/* Buttons underneath signature pad */}
        <div className="mt-4 flex gap-2.5">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={handleClear}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Eraser size={14} /> 지우기
              </button>
              
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaved}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  isSaved 
                    ? 'bg-slate-300 text-slate-500 border border-slate-300 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/10'
                }`}
              >
                <Check size={14} /> {isSaved ? "저장 완료" : "서명 저장"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={startEditing}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Eraser size={14} /> 서명 다시 작성하기
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
