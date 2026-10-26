import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useAuth } from '../services/AuthContext';
import { CanvasSocket } from '../services/websocket';
import {
  Pencil,
  Eraser,
  Square,
  Circle,
  Minus,
  ArrowRight,
  Type,
  Trash2,
  Undo2,
  Redo2,
  Download,
  Eye,
  EyeOff,
  LogOut,
  Users,
  Shield,
  Clock,
  AlertTriangle
} from 'lucide-react';

// Preset color palette similar to MS Paint classic strip
const PALETTE = [
  '#000000', '#7f7f7f', '#880015', '#ed1c24', '#ff7f27', '#fff200', '#22b14c', '#00a2e8', '#3f48cc', '#a349a4',
  '#ffffff', '#c3c3c3', '#b97a57', '#ffaec9', '#ffc90e', '#efe4b0', '#b5e61d', '#99d9ea', '#7092be', '#c8bfe7'
];

export const CanvasRoomPage = ({ room, onLeaveRoom }) => {
  const { user } = useAuth();
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const socketRef = useRef(null);

  // Top Left UI States
  const [showPassword, setShowPassword] = useState(false);
  const [roomMembers, setRoomMembers] = useState([]);
  const [destructionWarning, setDestructionWarning] = useState(null); // countdown seconds

  // Tool states (MS Paint features without bucket)
  const [tool, setTool] = useState('pencil'); // 'pencil' | 'brush' | 'eraser' | 'line' | 'arrow' | 'rectangle' | 'circle' | 'text'
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [fillShape, setFillShape] = useState(false); // MS Paint outline vs fill
  const [textInputVal, setTextInputVal] = useState('');
  const [textPos, setTextPos] = useState(null);

  // History & Elements for Undo/Redo & sync
  const [elements, setElements] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [currentElement, setCurrentElement] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('CONNECTING');

  // Redraw canvas helper
  const drawElement = useCallback((ctx, el) => {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = el.strokeColor || '#000000';
    ctx.lineWidth = el.strokeWidth || 3;
    ctx.fillStyle = el.fillColor || el.strokeColor || '#000000';

    switch (el.type) {
      case 'pencil':
      case 'brush':
        if (!el.points || el.points.length < 2) break;
        ctx.beginPath();
        ctx.moveTo(el.points[0].x, el.points[0].y);
        for (let i = 1; i < el.points.length; i++) {
          ctx.lineTo(el.points[i].x, el.points[i].y);
        }
        ctx.stroke();
        break;

      case 'eraser':
        if (!el.points || el.points.length < 2) break;
        ctx.strokeStyle = '#ffffff'; // Erase to white canvas
        ctx.lineWidth = (el.strokeWidth || 3) * 3;
        ctx.beginPath();
        ctx.moveTo(el.points[0].x, el.points[0].y);
        for (let i = 1; i < el.points.length; i++) {
          ctx.lineTo(el.points[i].x, el.points[i].y);
        }
        ctx.stroke();
        break;

      case 'line':
        ctx.beginPath();
        ctx.moveTo(el.startX, el.startY);
        ctx.lineTo(el.endX, el.endY);
        ctx.stroke();
        break;

      case 'arrow': {
        const dx = el.endX - el.startX;
        const dy = el.endY - el.startY;
        const angle = Math.atan2(dy, dx);
        const headLen = Math.max(12, el.strokeWidth * 3);
        ctx.beginPath();
        ctx.moveTo(el.startX, el.startY);
        ctx.lineTo(el.endX, el.endY);
        ctx.stroke();

        // Draw arrow head
        ctx.beginPath();
        ctx.moveTo(el.endX, el.endY);
        ctx.lineTo(el.endX - headLen * Math.cos(angle - Math.PI / 6), el.endY - headLen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(el.endX, el.endY);
        ctx.lineTo(el.endX - headLen * Math.cos(angle + Math.PI / 6), el.endY - headLen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
        break;
      }

      case 'rectangle': {
        const x = Math.min(el.startX, el.endX);
        const y = Math.min(el.startY, el.endY);
        const w = Math.abs(el.endX - el.startX);
        const h = Math.abs(el.endY - el.startY);
        if (el.filled) {
          ctx.fillRect(x, y, w, h);
        }
        ctx.strokeRect(x, y, w, h);
        break;
      }

      case 'circle': {
        const radius = Math.sqrt(Math.pow(el.endX - el.startX, 2) + Math.pow(el.endY - el.startY, 2));
        ctx.beginPath();
        ctx.arc(el.startX, el.startY, radius, 0, Math.PI * 2);
        if (el.filled) {
          ctx.fill();
        }
        ctx.stroke();
        break;
      }

      case 'text':
        ctx.font = `${Math.max(16, el.strokeWidth * 5)}px 'Plus Jakarta Sans', sans-serif`;
        ctx.fillStyle = el.strokeColor || '#000000';
        ctx.fillText(el.text, el.x, el.y);
        break;

      default:
        break;
    }

    ctx.restore();
  }, []);

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Fill Solid White
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw all stored elements
    for (const el of elements) {
      drawElement(ctx, el);
    }

    // Draw active drawing shape in progress
    if (currentElement) {
      drawElement(ctx, currentElement);
    }
  }, [elements, currentElement, drawElement]);

  // Adjust canvas resolution dynamically to match container
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    if (canvas.width !== rect.width || canvas.height !== rect.height) {
      canvas.width = rect.width;
      canvas.height = rect.height;
      renderCanvas();
    }
  }, [renderCanvas]);

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  // Always redraw whenever elements change
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Setup WebSocket connection
  useEffect(() => {
    const socket = new CanvasSocket(
      room.roomid,
      user,
      (msg) => {
        const { type, payload } = msg;

        switch (type) {
          case 'JOIN_SUCCESS':
            if (payload.members) setRoomMembers(payload.members);
            if (payload.canvasState && Array.isArray(payload.canvasState)) {
              setElements(payload.canvasState);
            }
            break;

          case 'USER_JOINED':
          case 'USER_LEFT':
            if (payload.members) setRoomMembers(payload.members);
            break;

          case 'REMOTE_DRAW_STEP':
            if (payload.element) {
              setElements((prev) => [...prev, payload.element]);
            }
            break;

          case 'REMOTE_DRAW_BATCH':
          case 'CANVAS_SYNCED':
            if (Array.isArray(payload.elements)) {
              setElements(payload.elements);
            } else if (Array.isArray(payload.canvasState)) {
              setElements(payload.canvasState);
            }
            break;

          case 'CANVAS_CLEARED':
            setElements([]);
            setRedoStack([]);
            break;

          case 'ROOM_DESTRUCTION_WARNING':
            setDestructionWarning(payload.secondsLeft || 10);
            break;

          case 'ROOM_DESTRUCTION_TICK':
            setDestructionWarning(payload.secondsLeft);
            break;

          case 'DESTRUCTION_CANCELLED':
            setDestructionWarning(null);
            break;

          case 'ROOM_DESTROYED':
            alert('Room leader has left and 10 seconds expired. The room has been destroyed.');
            onLeaveRoom();
            break;

          case 'ROOM_FULL':
            alert('This room has reached the maximum capacity of 5 members.');
            onLeaveRoom();
            break;

          default:
            break;
        }
      },
      (status) => setConnectionStatus(status)
    );

    socket.connect();
    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [room.roomid, user, onLeaveRoom]);

  // Mouse / Pointer Event Coordinates
  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handlePointerDown = (e) => {
    const { x, y } = getCanvasCoords(e);

    if (tool === 'text') {
      setTextPos({ x, y });
      return;
    }

    isDrawingRef.current = true;

    let newEl = null;
    if (tool === 'pencil' || tool === 'brush' || tool === 'eraser') {
      newEl = {
        id: Date.now() + Math.random(),
        type: tool,
        strokeColor,
        strokeWidth: tool === 'brush' ? strokeWidth * 2 : strokeWidth,
        points: [{ x, y }]
      };
    } else {
      newEl = {
        id: Date.now() + Math.random(),
        type: tool,
        strokeColor,
        strokeWidth,
        filled: fillShape,
        startX: x,
        startY: y,
        endX: x,
        endY: y
      };
    }

    setCurrentElement(newEl);
  };

  const handlePointerMove = (e) => {
    if (!isDrawingRef.current || !currentElement) return;
    const { x, y } = getCanvasCoords(e);

    if (currentElement.type === 'pencil' || currentElement.type === 'brush' || currentElement.type === 'eraser') {
      setCurrentElement((prev) => ({
        ...prev,
        points: [...prev.points, { x, y }]
      }));
    } else {
      setCurrentElement((prev) => ({
        ...prev,
        endX: x,
        endY: y
      }));
    }
  };

  const handlePointerUp = () => {
    if (!isDrawingRef.current || !currentElement) return;
    isDrawingRef.current = false;

    // Add completed element
    setElements((prev) => [...prev, currentElement]);
    setRedoStack([]); // Clear redo stack on new action

    // Broadcast through WebSocket to all peers
    if (socketRef.current) {
      socketRef.current.sendDrawStep(currentElement);
    }

    setCurrentElement(null);
  };

  // Submit Text onto Canvas
  const handleAddText = (e) => {
    e.preventDefault();
    if (!textInputVal.trim() || !textPos) return;

    const textEl = {
      id: Date.now() + Math.random(),
      type: 'text',
      text: textInputVal.trim(),
      strokeColor,
      strokeWidth,
      x: textPos.x,
      y: textPos.y
    };

    setElements((prev) => [...prev, textEl]);
    if (socketRef.current) {
      socketRef.current.sendDrawStep(textEl);
    }

    setTextInputVal('');
    setTextPos(null);
  };

  // Undo Functionality
  const handleUndo = () => {
    if (elements.length === 0) return;
    const last = elements[elements.length - 1];
    const newElements = elements.slice(0, elements.length - 1);
    setElements(newElements);
    setRedoStack((prev) => [...prev, last]);

    if (socketRef.current) {
      socketRef.current.sendSyncCanvas(newElements);
    }
  };

  // Redo Functionality
  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const lastRedo = redoStack[redoStack.length - 1];
    const newRedo = redoStack.slice(0, redoStack.length - 1);
    const newElements = [...elements, lastRedo];

    setRedoStack(newRedo);
    setElements(newElements);

    if (socketRef.current) {
      socketRef.current.sendSyncCanvas(newElements);
    }
  };

  // Clear Canvas
  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear the entire whiteboard?')) {
      setElements([]);
      setRedoStack([]);
      if (socketRef.current) {
        socketRef.current.sendClearCanvas();
      }
    }
  };

  // Download / Export Canvas Image
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const image = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = image;
    link.download = `${room.roomname || 'canvas'}-${Date.now()}.png`;
    link.click();
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        background: 'var(--bg-main)',
        overflow: 'hidden'
      }}
    >
      {/* Top Header Bar */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 24px',
          background: 'var(--bg-card)',
          borderBottom: '1px solid rgba(209, 217, 230, 0.6)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          zIndex: 10
        }}
      >
        {/* Top Left: Room Name & Password with Toggle Eye Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div className="neu-card-sm" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div>
              <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>
                Room Name
              </span>
              <h2 style={{ fontSize: '16px', fontWeight: '800', color: '#1e293b', lineHeight: 1.2 }}>
                {room.roomname}
              </h2>
            </div>

            <div style={{ width: '1px', height: '24px', background: '#cbd5e1' }} />

            <div>
              <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>
                Room ID
              </span>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#4f46e5', fontFamily: 'var(--font-mono)' }}>
                {room.roomid}
              </div>
            </div>

            {/* Password section if room has password */}
            {room.password && room.password !== '' && (
              <>
                <div style={{ width: '1px', height: '24px', background: '#cbd5e1' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>
                      Password
                    </span>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#dc2626', fontFamily: 'var(--font-mono)', letterSpacing: '1px' }}>
                      {showPassword ? room.password : '•••••'}
                    </div>
                  </div>

                  {/* Toggle Eye Button */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="neu-button"
                    title={showPassword ? 'Hide password' : 'Show password'}
                    style={{ width: '30px', height: '30px', padding: 0, borderRadius: '6px' }}
                  >
                    {showPassword ? <EyeOff size={15} color="#64748b" /> : <Eye size={15} color="#64748b" />}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Member Count (Max 5) */}
          <div
            className="neu-card-sm"
            style={{
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: '700',
              color: roomMembers.length >= 5 ? '#dc2626' : '#10b981'
            }}
          >
            <Users size={16} />
            <span>{roomMembers.length} / 5 Collaborators</span>
          </div>
        </div>

        {/* Destruction Timer Warning (if leader left) */}
        {destructionWarning !== null && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#fef2f2',
              border: '2px solid #ef4444',
              color: '#dc2626',
              padding: '6px 16px',
              borderRadius: '100px',
              fontWeight: '800',
              fontSize: '13px',
              animation: 'pulse 1s infinite'
            }}
          >
            <AlertTriangle size={18} />
            <span>Leader left! Room destroys in: {destructionWarning}s</span>
          </div>
        )}

        {/* Top Right Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handleDownload}
            className="neu-button"
            title="Download PNG snapshot"
            style={{ height: '38px', fontSize: '13px' }}
          >
            <Download size={16} />
            Export
          </button>

          <button
            onClick={onLeaveRoom}
            className="neu-button"
            style={{ height: '38px', fontSize: '13px', color: '#ef4444' }}
            title="Leave Canvas Room"
          >
            <LogOut size={16} />
            Leave Room
          </button>
        </div>
      </header>

      {/* MS Paint Style Tool Ribbon Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '8px 20px',
          background: 'var(--bg-card)',
          borderBottom: '1px solid rgba(209, 217, 230, 0.5)',
          overflowX: 'auto',
          userSelect: 'none'
        }}
      >
        {/* Undo / Redo */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={handleUndo}
            disabled={elements.length === 0}
            className="neu-button"
            style={{ width: '34px', height: '34px', padding: 0, opacity: elements.length === 0 ? 0.4 : 1 }}
            title="Undo"
          >
            <Undo2 size={16} />
          </button>
          <button
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            className="neu-button"
            style={{ width: '34px', height: '34px', padding: 0, opacity: redoStack.length === 0 ? 0.4 : 1 }}
            title="Redo"
          >
            <Redo2 size={16} />
          </button>
        </div>

        <div style={{ width: '1px', height: '26px', background: '#cbd5e1' }} />

        {/* MS Paint Tools (Pencil, Brush, Eraser, Text, Shapes) */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setTool('pencil')}
            className={`neu-button ${tool === 'pencil' ? 'active' : ''}`}
            title="Pencil"
            style={{ width: '34px', height: '34px', padding: 0 }}
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => setTool('brush')}
            className={`neu-button ${tool === 'brush' ? 'active' : ''}`}
            title="Brush"
            style={{ width: '34px', height: '34px', padding: 0 }}
          >
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'currentColor' }} />
          </button>
          <button
            onClick={() => setTool('eraser')}
            className={`neu-button ${tool === 'eraser' ? 'active' : ''}`}
            title="Eraser"
            style={{ width: '34px', height: '34px', padding: 0 }}
          >
            <Eraser size={16} />
          </button>
          <button
            onClick={() => setTool('text')}
            className={`neu-button ${tool === 'text' ? 'active' : ''}`}
            title="Text Tool"
            style={{ width: '34px', height: '34px', padding: 0 }}
          >
            <Type size={16} />
          </button>
        </div>

        <div style={{ width: '1px', height: '26px', background: '#cbd5e1' }} />

        {/* Shapes (Line, Arrow, Rectangle, Circle) */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setTool('line')}
            className={`neu-button ${tool === 'line' ? 'active' : ''}`}
            title="Straight Line"
            style={{ width: '34px', height: '34px', padding: 0 }}
          >
            <Minus size={16} style={{ transform: 'rotate(-45deg)' }} />
          </button>
          <button
            onClick={() => setTool('arrow')}
            className={`neu-button ${tool === 'arrow' ? 'active' : ''}`}
            title="Arrow"
            style={{ width: '34px', height: '34px', padding: 0 }}
          >
            <ArrowRight size={16} />
          </button>
          <button
            onClick={() => setTool('rectangle')}
            className={`neu-button ${tool === 'rectangle' ? 'active' : ''}`}
            title="Rectangle"
            style={{ width: '34px', height: '34px', padding: 0 }}
          >
            <Square size={16} />
          </button>
          <button
            onClick={() => setTool('circle')}
            className={`neu-button ${tool === 'circle' ? 'active' : ''}`}
            title="Circle / Ellipse"
            style={{ width: '34px', height: '34px', padding: 0 }}
          >
            <Circle size={16} />
          </button>
        </div>

        {/* Outline vs Fill Shape option */}
        {(tool === 'rectangle' || tool === 'circle') && (
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              color: '#475569',
              padding: '0 4px'
            }}
          >
            <input
              type="checkbox"
              checked={fillShape}
              onChange={(e) => setFillShape(e.target.checked)}
              style={{ accentColor: '#4f46e5' }}
            />
            Fill
          </label>
        )}

        <div style={{ width: '1px', height: '26px', background: '#cbd5e1' }} />

        {/* Stroke Width Slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 4px' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>SIZE:</span>
          <input
            type="range"
            min={1}
            max={24}
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
            style={{ width: '70px', accentColor: '#4f46e5', cursor: 'pointer' }}
          />
          <span style={{ fontSize: '12px', fontWeight: '700', width: '18px', textAlign: 'center' }}>
            {strokeWidth}
          </span>
        </div>

        <div style={{ width: '1px', height: '26px', background: '#cbd5e1' }} />

        {/* Active Color Preview & Color Picker */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            title="Current Selected Color"
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: strokeColor,
              boxShadow: 'var(--neu-flat-sm)',
              border: '2px solid #ffffff'
            }}
          />

          {/* Color Palette Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 16px)', gap: '4px' }}>
            {PALETTE.map((color) => (
              <div
                key={color}
                onClick={() => setStrokeColor(color)}
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '3px',
                  background: color,
                  border: strokeColor === color ? '2px solid #4f46e5' : '1px solid rgba(0,0,0,0.15)',
                  cursor: 'pointer',
                  transform: strokeColor === color ? 'scale(1.2)' : 'none',
                  transition: 'transform 0.1s'
                }}
              />
            ))}
          </div>

          <input
            type="color"
            value={strokeColor}
            onChange={(e) => setStrokeColor(e.target.value)}
            style={{
              width: '24px',
              height: '24px',
              padding: 0,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer'
            }}
            title="Custom Color Picker"
          />
        </div>

        <div style={{ width: '1px', height: '26px', background: '#cbd5e1' }} />

        {/* Clear All Button */}
        <button
          onClick={handleClear}
          className="neu-button"
          title="Clear Whiteboard"
          style={{ height: '34px', fontSize: '12px', color: '#dc2626' }}
        >
          <Trash2 size={15} />
          Clear
        </button>
      </div>

      {/* Main Solid White Canvas Filling Almost the Screen */}
      <main
        style={{
          flex: 1,
          position: 'relative',
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            position: 'relative',
            borderRadius: '16px',
            boxShadow: 'var(--neu-flat-lg)',
            overflow: 'hidden',
            background: '#ffffff',
            border: '2px solid rgba(255, 255, 255, 0.9)'
          }}
        >
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{
              display: 'block',
              width: '100%',
              height: '100%',
              touchAction: 'none',
              cursor: tool === 'eraser' ? 'cell' : tool === 'text' ? 'text' : 'crosshair'
            }}
          />

          {/* Text Tool Floating Prompt Popup */}
          {textPos && (
            <form
              onSubmit={handleAddText}
              style={{
                position: 'absolute',
                left: `${textPos.x}px`,
                top: `${textPos.y}px`,
                background: '#ffffff',
                padding: '8px 12px',
                borderRadius: '8px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                display: 'flex',
                gap: '6px',
                zIndex: 20
              }}
            >
              <input
                autoFocus
                type="text"
                placeholder="Type text and press Enter..."
                value={textInputVal}
                onChange={(e) => setTextInputVal(e.target.value)}
                style={{
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '14px',
                  outline: 'none',
                  color: strokeColor
                }}
              />
              <button
                type="submit"
                className="neu-button neu-button-primary"
                style={{ padding: '4px 10px', fontSize: '12px' }}
              >
                Place
              </button>
              <button
                type="button"
                onClick={() => setTextPos(null)}
                className="neu-button"
                style={{ padding: '4px 10px', fontSize: '12px' }}
              >
                ✕
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
};
