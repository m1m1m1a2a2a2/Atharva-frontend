
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ProjectImage, Tool, Point, AnnotationLine, AnnotationBox } from '../types';
import {
  MousePointer2, Ruler, Square,
  Trash2, ZoomIn, ZoomOut
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";

interface AnnotationCanvasProps {
  project: ProjectImage;
  selectedId: string | null;
  onSelectId: (id: string | null) => void;
  onUpdateProject: (project: ProjectImage) => void;
}

export const AnnotationCanvas: React.FC<AnnotationCanvasProps> = ({
  project,
  selectedId,
  onSelectId,
  onUpdateProject
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageCacheRef = useRef<HTMLImageElement | null>(null);
  const [tool, setTool] = useState<Tool>(Tool.SELECT);
  const [zoom, setZoom] = useState(1);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [currentMousePos, setCurrentMousePos] = useState<Point | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  // Pre-load and cache the image to prevent flickering
  useEffect(() => {
    setIsImageLoaded(false);
    const img = new Image();
    img.src = project.url;
    img.onload = () => {
      imageCacheRef.current = img;
      setIsImageLoaded(true);
      // Auto-fit logic could be added here if desired, 
      // but keeping zoom control manual as per existing UI.
    };
  }, [project.url]);

  const render = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    const img = imageCacheRef.current;

    if (!ctx || !canvasRef.current || !img || !isImageLoaded) return;

    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    ctx.save();
    ctx.scale(zoom, zoom);
    ctx.drawImage(img, 0, 0);

    // Draw lines
    project.lines.forEach(line => {
      const isSelected = line.id === selectedId;
      ctx.beginPath();
      ctx.moveTo(line.points[0].x, line.points[0].y);
      ctx.lineTo(line.points[1].x, line.points[1].y);
      ctx.strokeStyle = isSelected ? '#3b82f6' : line.color;
      ctx.lineWidth = 3 / zoom;
      ctx.stroke();

      [line.points[0], line.points[1]].forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4 / zoom, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? '#3b82f6' : '#ffffff';
        ctx.fill();
        ctx.strokeStyle = line.color;
        ctx.lineWidth = 1 / zoom;
        ctx.stroke();
      });
    });

    // Draw boxes
    project.boxes.forEach(box => {
      const isSelected = box.id === selectedId;
      ctx.beginPath();
      ctx.rect(box.x, box.y, box.width, box.height);
      ctx.strokeStyle = isSelected ? '#3b82f6' : box.color;
      ctx.lineWidth = 2 / zoom;
      ctx.stroke();
      ctx.fillStyle = (isSelected ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.05)');
      ctx.fill();
    });

    // Draw current drawing overlay
    if (isDrawing && startPoint && currentMousePos) {
      ctx.beginPath();
      if (tool === Tool.LINE) {
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(currentMousePos.x, currentMousePos.y);
        ctx.strokeStyle = '#f59e0b';
        ctx.setLineDash([5 / zoom, 5 / zoom]);
      } else if (tool === Tool.BOX) {
        ctx.rect(startPoint.x, startPoint.y, currentMousePos.x - startPoint.x, currentMousePos.y - startPoint.y);
        ctx.strokeStyle = '#f59e0b';
        ctx.setLineDash([5 / zoom, 5 / zoom]);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }, [project, zoom, isDrawing, startPoint, currentMousePos, selectedId, tool, isImageLoaded]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
        render();
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [render]);

  useEffect(() => {
    render();
  }, [render]);

  const getCanvasMousePos = (e: React.MouseEvent | MouseEvent): Point => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / zoom,
      y: (e.clientY - rect.top) / zoom,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = getCanvasMousePos(e);

    if (tool === Tool.SELECT) {
      const clickedLine = project.lines.find(l => {
        const d = distToSegment(pos, l.points[0], l.points[1]);
        return d < 10 / zoom;
      });
      if (clickedLine) {
        onSelectId(clickedLine.id);
        return;
      }

      const clickedBox = project.boxes.find(b =>
        pos.x >= b.x && pos.x <= b.x + b.width &&
        pos.y >= b.y && pos.y <= b.y + b.height
      );
      if (clickedBox) {
        onSelectId(clickedBox.id);
        return;
      }
      onSelectId(null);
    } else {
      setIsDrawing(true);
      setStartPoint(pos);
      setCurrentMousePos(pos);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const pos = getCanvasMousePos(e);
    setCurrentMousePos(pos);
    if (isDrawing || tool === Tool.SELECT) {
      render();
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDrawing || !startPoint || !currentMousePos) {
      setIsDrawing(false);
      return;
    }

    const endPoint = getCanvasMousePos(e);

    if (tool === Tool.LINE) {
      const newLine: AnnotationLine = {
        id: Math.random().toString(36).substr(2, 9),
        points: [startPoint, endPoint],
        color: '#f59e0b',
        label: `Line ${project.lines.length + 1}`
      };
      onUpdateProject({ ...project, lines: [...project.lines, newLine] });
      onSelectId(newLine.id);
    } else if (tool === Tool.BOX) {
      const newBox: AnnotationBox = {
        id: Math.random().toString(36).substr(2, 9),
        x: Math.min(startPoint.x, endPoint.x),
        y: Math.min(startPoint.y, endPoint.y),
        width: Math.abs(endPoint.x - startPoint.x),
        height: Math.abs(endPoint.y - startPoint.y),
        color: '#10b981',
        label: `Box ${project.boxes.length + 1}`
      };
      onUpdateProject({ ...project, boxes: [...project.boxes, newBox] });
      onSelectId(newBox.id);
    }

    setIsDrawing(false);
    setStartPoint(null);
    setTool(Tool.SELECT);
  };

  const handleDelete = () => {
    if (!selectedId) return;
    onUpdateProject({
      ...project,
      lines: project.lines.filter(l => l.id !== selectedId),
      boxes: project.boxes.filter(b => b.id !== selectedId)
    });
    onSelectId(null);
  };

  function distToSegment(p: Point, v: Point, w: Point) {
    const l2 = Math.pow(v.x - w.x, 2) + Math.pow(v.y - w.y, 2);
    if (l2 === 0) return Math.sqrt(Math.pow(p.x - v.x, 2) + Math.pow(p.y - v.y, 2));
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.sqrt(Math.pow(p.x - (v.x + t * (w.x - v.x)), 2) + Math.pow(p.y - (v.y + t * (w.y - v.y)), 2));
  }

  return (
    <div className="flex-1 flex flex-col relative bg-[#020617] p-2 overflow-hidden">
      {/* Canvas Controls */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 flex items-center bg-[#0f172a]/90 backdrop-blur-xl rounded-[2rem] shadow-2xl p-2 border border-slate-700/50">
        <div className="flex items-center gap-1.5 border-r border-slate-800 pr-3 mr-3 pl-1">
          <ToolbarButton
            active={tool === Tool.SELECT}
            onClick={() => setTool(Tool.SELECT)}
            icon={<MousePointer2 size={18} />}
            label="Select"
          />
          <ToolbarButton
            active={tool === Tool.LINE}
            onClick={() => setTool(Tool.LINE)}
            icon={<Ruler size={18} />}
            label="Line Ruler"
          />
          <ToolbarButton
            active={tool === Tool.BOX}
            onClick={() => setTool(Tool.BOX)}
            icon={<Square size={18} />}
            label="Box Marker"
          />
        </div>

        <div className="flex items-center gap-1.5 border-r border-slate-800 pr-3 mr-3">
          <ToolbarButton onClick={() => setZoom(z => Math.max(0.1, z - 0.1))} icon={<ZoomOut size={16} />} label="Zoom Out" />
          <span className="text-[11px] font-black text-slate-500 w-12 text-center uppercase tracking-tighter">{Math.round(zoom * 100)}%</span>
          <ToolbarButton onClick={() => setZoom(z => Math.min(5, z + 0.1))} icon={<ZoomIn size={16} />} label="Zoom In" />
        </div>

        <div className="flex items-center gap-1.5 pr-1">

          <ToolbarButton onClick={handleDelete} icon={<Trash2 size={18} />} label="Purge" disabled={!selectedId} variant="danger" />
        </div>
      </div>

      {/* Dynamic Cursor Info */}
      <div className="absolute bottom-6 right-6 z-20 bg-blue-600 text-white px-4 py-2 rounded-2xl text-[10px] font-bold flex items-center gap-4 shadow-xl border border-blue-500/50 tracking-widest uppercase">
        <div className="flex items-center gap-2">
          <span>X: {Math.round(currentMousePos?.x || 0)}</span>
          <span className="opacity-40">|</span>
          <span>Y: {Math.round(currentMousePos?.y || 0)}</span>
        </div>
      </div>

      {/* Viewport - REMOVED border radius to show the full image edges */}
      <div ref={containerRef} className="flex-1 overflow-auto bg-[#000] border border-slate-800/50 cursor-crosshair shadow-2xl relative flex items-center justify-center rounded-none">
        {!isImageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="mx-auto block"
        />
      </div>
    </div>
  );
};

interface ToolbarButtonProps {
  active?: boolean;
  onClick?: () => void;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  isLoading?: boolean;
  variant?: 'default' | 'danger' | 'ai';
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  active, onClick, icon, label, disabled, isLoading, variant = 'default'
}) => {
  const baseClasses = "w-10 h-10 rounded-2xl flex items-center justify-center transition-all group relative border border-transparent";

  const activeClasses = active
    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20 border-blue-500"
    : "hover:bg-slate-800 text-slate-400 hover:text-white";

  const variantClasses = {
    default: activeClasses,
    danger: "hover:bg-red-500/10 text-slate-500 hover:text-red-400 disabled:opacity-20",
    ai: "text-amber-500 hover:bg-amber-500/10 hover:border-amber-500/20"
  }[variant];

  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`${baseClasses} ${variantClasses}`}
      title={label}
    >
      {isLoading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-amber-500 border-t-transparent"></div> : icon}
      <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 bg-slate-800 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity font-bold uppercase tracking-widest border border-slate-700 shadow-xl">
        {label}
      </span>
    </button>
  );
};
