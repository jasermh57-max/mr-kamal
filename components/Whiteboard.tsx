import React, { useRef, useEffect, useState } from 'react';
import { Pencil, Eraser, Trash2, Image as ImageIcon, Lock } from 'lucide-react';

interface WhiteboardProps {
  readOnly: boolean;
}

const Whiteboard: React.FC<WhiteboardProps> = ({ readOnly }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(2);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');

  // Initialize Canvas Size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const setSize = () => {
        const parent = canvas.parentElement;
        if (parent) {
            canvas.width = parent.clientWidth;
            canvas.height = parent.clientHeight;
        }
        // Reset context properties after resize
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    };

    setSize();
    window.addEventListener('resize', setSize);
    return () => window.removeEventListener('resize', setSize);
  }, []);

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Capture pointer to track outside canvas
    canvas.setPointerCapture(e.pointerId);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || readOnly) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    // Eraser is now 6x the size of the slider value for better coverage
    ctx.lineWidth = tool === 'eraser' ? lineWidth * 6 : lineWidth;
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
    
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas) canvas.releasePointerCapture(e.pointerId);
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
          // Calculate Aspect Ratio to fit properly
          const hRatio = canvas.width / img.width;
          const vRatio = canvas.height / img.height;
          const ratio = Math.min(hRatio, vRatio) * 0.8; // Scale to 80% of canvas max
          
          const centerShift_x = (canvas.width - img.width * ratio) / 2;
          const centerShift_y = (canvas.height - img.height * ratio) / 2;
          
          ctx.drawImage(img, 0, 0, img.width, img.height, centerShift_x, centerShift_y, img.width * ratio, img.height * ratio);
        }
      };
      if (event.target?.result) {
        img.src = event.target.result as string;
      }
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be selected again
    e.target.value = ''; 
  };

  const triggerImageUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col h-full w-full bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden relative touch-none">
      <div className="absolute top-4 left-4 z-10 flex space-x-2 bg-slate-900/10 backdrop-blur p-2 rounded-lg items-center shadow-sm">
        {!readOnly && (
          <>
            <button
              onClick={() => setTool('pen')}
              className={`p-2 rounded transition ${tool === 'pen' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 hover:bg-indigo-50'}`}
              title="Pen"
            >
              <Pencil size={18} />
            </button>
            <button
              onClick={() => setTool('eraser')}
              className={`p-2 rounded transition ${tool === 'eraser' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 hover:bg-indigo-50'}`}
              title="Eraser"
            >
              <Eraser size={18} />
            </button>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border-0 p-0"
              title="Color"
            />
             <input
              type="range"
              min="1"
              max="20"
              value={lineWidth}
              onChange={(e) => setLineWidth(Number(e.target.value))}
              className="w-16 cursor-pointer"
              title="Size"
            />
            <div className="h-6 w-px bg-slate-400/50 mx-1"></div>
            <button
              onClick={triggerImageUpload}
              className="p-2 rounded bg-white text-slate-700 hover:bg-indigo-50 transition"
              title="Insert Image"
            >
              <ImageIcon size={18} />
            </button>
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleImageUpload}
            />
            <button
              onClick={clearCanvas}
              className="p-2 rounded bg-red-100 text-red-600 hover:bg-red-200 transition"
              title="Clear All"
            >
              <Trash2 size={18} />
            </button>
          </>
        )}
        {readOnly && (
           <span className="px-3 py-2 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded flex items-center shadow-sm border border-yellow-200">
             <Lock size={12} className="mr-1" /> View Only
           </span>
        )}
      </div>

      <canvas
        ref={canvasRef}
        onPointerDown={startDrawing}
        onPointerMove={draw}
        onPointerUp={stopDrawing}
        onPointerLeave={stopDrawing}
        className={`w-full h-full touch-none ${readOnly ? 'cursor-default' : 'cursor-crosshair'}`}
        style={{ touchAction: 'none' }}
      />
    </div>
  );
};

export default Whiteboard;