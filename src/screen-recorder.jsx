import React, { useState, useRef, useEffect } from 'react';
import { Camera, Square, Monitor, Maximize, Edit3, Play, Pause, Download, Trash2, Mic, MicOff, Move, X, Minimize2, Hand, MousePointer, Type, Minus, ArrowRight, Eraser, Circle as CircleIcon, Undo, Redo, Trash, ChevronDown } from 'lucide-react';

const ScreenRecorder = () => {
  // Recording states
  const [recordingMode, setRecordingMode] = useState('screen');
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [recordingTime, setRecordingTime] = useState(0);
  
  // Camera states
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraShape, setCameraShape] = useState('circle');
  const [cameraPosition, setCameraPosition] = useState({ x: 50, y: 50 });
  const [cameraSize, setCameraSize] = useState(200);
  const [isDraggingCamera, setIsDraggingCamera] = useState(false);
  
  // Area selection states
  const [isSelectingArea, setIsSelectingArea] = useState(false);
  const [selectionStart, setSelectionStart] = useState(null);
  const [selectionEnd, setSelectionEnd] = useState(null);
  const [selectedArea, setSelectedArea] = useState(null);
  
  // Whiteboard states
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [whiteboardTool, setWhiteboardTool] = useState('select');
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [fillStyle, setFillStyle] = useState('solid');
  const [backgroundColor, setBackgroundColor] = useState('transparent');
  const [elements, setElements] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentElement, setCurrentElement] = useState(null);
  const [history, setHistory] = useState([[]]);
  const [historyStep, setHistoryStep] = useState(0);
  const [textInput, setTextInput] = useState('');
  const [textPosition, setTextPosition] = useState(null);
  const [fontSize, setFontSize] = useState(20);
  const [selectedElements, setSelectedElements] = useState([]);
  
  // Settings
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [videoQuality, setVideoQuality] = useState('high');
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  
  // Refs
  const mediaRecorderRef = useRef(null);
  const screenStreamRef = useRef(null);
  const cameraVideoRef = useRef(null);
  const recordedVideoRef = useRef(null);
  const timerRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const whiteboardCanvasRef = useRef(null);
  const areaSelectionRef = useRef(null);
  const combinedCanvasRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Timer
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording, isPaused]);

  // Cleanup
  useEffect(() => {
    return () => {
      stopAllStreams();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Close quality menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showQualityMenu && !e.target.closest('.quality-menu-container')) {
        setShowQualityMenu(false);
      }
    };
    if (showQualityMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showQualityMenu]);

  const stopAllStreams = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Camera functions
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }, 
        audio: false 
      });
      setCameraStream(stream);
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
      }
      setShowCamera(true);
    } catch (err) {
      console.error('Error accessing camera:', err);
      alert('无法访问摄像头，请检查权限设置');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  // Camera drag handlers
  const handleCameraMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingCamera(true);
    dragStartRef.current = {
      x: e.clientX - cameraPosition.x,
      y: e.clientY - cameraPosition.y
    };
  };

  const handleCameraMouseMove = (e) => {
    if (isDraggingCamera) {
      const maxX = window.innerWidth - cameraSize - 20;
      const maxY = window.innerHeight - cameraSize - 20;
      setCameraPosition({
        x: Math.max(20, Math.min(maxX, e.clientX - dragStartRef.current.x)),
        y: Math.max(20, Math.min(maxY, e.clientY - dragStartRef.current.y))
      });
    }
  };

  const handleCameraMouseUp = () => {
    setIsDraggingCamera(false);
  };

  useEffect(() => {
    if (isDraggingCamera) {
      window.addEventListener('mousemove', handleCameraMouseMove);
      window.addEventListener('mouseup', handleCameraMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleCameraMouseMove);
        window.removeEventListener('mouseup', handleCameraMouseUp);
      };
    }
  }, [isDraggingCamera]);

  // Area selection
  const startAreaSelection = () => {
    setIsSelectingArea(true);
    setSelectionStart(null);
    setSelectionEnd(null);
    setSelectedArea(null);
  };

  const handleAreaMouseDown = (e) => {
    if (!isSelectingArea) return;
    const rect = areaSelectionRef.current.getBoundingClientRect();
    setSelectionStart({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleAreaMouseMove = (e) => {
    if (!isSelectingArea || !selectionStart) return;
    const rect = areaSelectionRef.current.getBoundingClientRect();
    setSelectionEnd({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleAreaMouseUp = (e) => {
    if (!isSelectingArea || !selectionStart) return;
    const rect = areaSelectionRef.current.getBoundingClientRect();
    const end = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    
    const area = {
      x: Math.min(selectionStart.x, end.x),
      y: Math.min(selectionStart.y, end.y),
      width: Math.abs(end.x - selectionStart.x),
      height: Math.abs(end.y - selectionStart.y)
    };
    
    if (area.width > 50 && area.height > 50) {
      setSelectedArea(area);
      setIsSelectingArea(false);
    }
  };

  // Whiteboard drawing
  const drawElement = (ctx, element) => {
    ctx.strokeStyle = element.strokeColor;
    ctx.fillStyle = element.backgroundColor || 'transparent';
    ctx.lineWidth = element.strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (element.type) {
      case 'pencil':
        ctx.beginPath();
        element.points.forEach((point, index) => {
          if (index === 0) ctx.moveTo(point.x, point.y);
          else ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();
        break;

      case 'line':
        ctx.beginPath();
        ctx.moveTo(element.x1, element.y1);
        ctx.lineTo(element.x2, element.y2);
        ctx.stroke();
        break;

      case 'arrow':
        ctx.beginPath();
        ctx.moveTo(element.x1, element.y1);
        ctx.lineTo(element.x2, element.y2);
        ctx.stroke();
        
        const angle = Math.atan2(element.y2 - element.y1, element.x2 - element.x1);
        const arrowLength = 15;
        ctx.beginPath();
        ctx.moveTo(element.x2, element.y2);
        ctx.lineTo(
          element.x2 - arrowLength * Math.cos(angle - Math.PI / 6),
          element.y2 - arrowLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(element.x2, element.y2);
        ctx.lineTo(
          element.x2 - arrowLength * Math.cos(angle + Math.PI / 6),
          element.y2 - arrowLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
        break;

      case 'rectangle':
        if (element.fillStyle === 'solid' && element.backgroundColor !== 'transparent') {
          ctx.fillRect(element.x, element.y, element.width, element.height);
        }
        ctx.strokeRect(element.x, element.y, element.width, element.height);
        break;

      case 'circle':
        const radius = Math.sqrt(Math.pow(element.width / 2, 2) + Math.pow(element.height / 2, 2));
        ctx.beginPath();
        ctx.arc(element.x + element.width / 2, element.y + element.height / 2, radius, 0, 2 * Math.PI);
        if (element.fillStyle === 'solid' && element.backgroundColor !== 'transparent') {
          ctx.fill();
        }
        ctx.stroke();
        break;

      case 'text':
        ctx.font = `${element.fontSize}px Arial`;
        ctx.fillStyle = element.strokeColor;
        ctx.fillText(element.text, element.x, element.y);
        break;
    }
  };

  const renderWhiteboard = () => {
    const canvas = whiteboardCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    elements.forEach(element => drawElement(ctx, element));
  };

  useEffect(() => {
    renderWhiteboard();
  }, [elements]);

  const handleWhiteboardMouseDown = (e) => {
    if (!showWhiteboard || whiteboardTool === 'select' || whiteboardTool === 'pan') return;
    
    const canvas = whiteboardCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    setIsDrawing(true);
    
    if (whiteboardTool === 'text') {
      setTextPosition({ x, y });
      return;
    }
    
    const newElement = {
      id: Date.now(),
      type: whiteboardTool,
      strokeColor,
      strokeWidth,
      backgroundColor,
      fillStyle,
      fontSize
    };
    
    if (whiteboardTool === 'pencil') {
      newElement.points = [{ x, y }];
    } else if (whiteboardTool === 'line' || whiteboardTool === 'arrow') {
      newElement.x1 = x;
      newElement.y1 = y;
      newElement.x2 = x;
      newElement.y2 = y;
    } else if (whiteboardTool === 'rectangle' || whiteboardTool === 'circle') {
      newElement.x = x;
      newElement.y = y;
      newElement.width = 0;
      newElement.height = 0;
    }
    
    setCurrentElement(newElement);
  };

  const handleWhiteboardMouseMove = (e) => {
    if (!isDrawing || !currentElement) return;
    
    const canvas = whiteboardCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    const updated = { ...currentElement };
    
    if (whiteboardTool === 'pencil') {
      updated.points = [...updated.points, { x, y }];
    } else if (whiteboardTool === 'line' || whiteboardTool === 'arrow') {
      updated.x2 = x;
      updated.y2 = y;
    } else if (whiteboardTool === 'rectangle' || whiteboardTool === 'circle') {
      updated.width = x - updated.x;
      updated.height = y - updated.y;
    }
    
    setCurrentElement(updated);
    setElements([...elements.filter(e => e.id !== updated.id), updated]);
  };

  const handleWhiteboardMouseUp = () => {
    if (currentElement && whiteboardTool !== 'text') {
      const newElements = [...elements.filter(e => e.id !== currentElement.id), currentElement];
      setElements(newElements);
      addToHistory(newElements);
    }
    setIsDrawing(false);
    setCurrentElement(null);
  };

  const handleTextSubmit = () => {
    if (textInput && textPosition) {
      const textElement = {
        id: Date.now(),
        type: 'text',
        text: textInput,
        x: textPosition.x,
        y: textPosition.y,
        strokeColor,
        fontSize
      };
      const newElements = [...elements, textElement];
      setElements(newElements);
      addToHistory(newElements);
      setTextInput('');
      setTextPosition(null);
    }
  };

  const addToHistory = (newElements) => {
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(newElements);
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
  };

  const undo = () => {
    if (historyStep > 0) {
      setHistoryStep(historyStep - 1);
      setElements(history[historyStep - 1]);
    }
  };

  const redo = () => {
    if (historyStep < history.length - 1) {
      setHistoryStep(historyStep + 1);
      setElements(history[historyStep + 1]);
    }
  };

  const clearWhiteboard = () => {
    const newElements = [];
    setElements(newElements);
    addToHistory(newElements);
  };

  // Recording
  const startRecording = async () => {
    try {
      if (recordingMode === 'area' && !selectedArea) {
        alert('请先选择要录制的区域');
        return;
      }
      
      const qualitySettings = {
        low: { width: 1280, height: 720, bitrate: 2500000 },
        medium: { width: 1920, height: 1080, bitrate: 5000000 },
        high: { width: 1920, height: 1080, bitrate: 8000000 },
        ultra: { width: 2560, height: 1440, bitrate: 12000000 }
      };
      const quality = qualitySettings[videoQuality];
      
      let screenStream;
      if (recordingMode === 'screen' || recordingMode === 'window' || recordingMode === 'area') {
        screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { 
            cursor: 'always',
            width: { ideal: quality.width },
            height: { ideal: quality.height }
          },
          audio: audioEnabled
        });
      }

      let audioStream = null;
      if (micEnabled) {
        try {
          audioStream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          });
        } catch (err) {
          console.warn('Microphone access denied:', err);
        }
      }

      screenStreamRef.current = screenStream;
      
      const canvas = document.createElement('canvas');
      canvas.width = quality.width;
      canvas.height = quality.height;
      combinedCanvasRef.current = canvas;
      
      const ctx = canvas.getContext('2d');
      const screenVideo = document.createElement('video');
      screenVideo.srcObject = screenStream;
      screenVideo.muted = true;
      await screenVideo.play();
      
      let cameraVideo = null;
      if (showCamera && cameraStream) {
        cameraVideo = document.createElement('video');
        cameraVideo.srcObject = cameraStream;
        cameraVideo.muted = true;
        await cameraVideo.play();
      }
      
      const whiteboardCanvas = whiteboardCanvasRef.current;
      
      const drawFrame = () => {
        if (screenVideo.paused || screenVideo.ended) return;
        
        // Draw screen
        if (recordingMode === 'area' && selectedArea) {
          const scaleX = screenVideo.videoWidth / window.innerWidth;
          const scaleY = screenVideo.videoHeight / window.innerHeight;
          ctx.drawImage(
            screenVideo,
            selectedArea.x * scaleX,
            selectedArea.y * scaleY,
            selectedArea.width * scaleX,
            selectedArea.height * scaleY,
            0, 0, canvas.width, canvas.height
          );
        } else {
          ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);
        }
        
        // Draw camera
        if (cameraVideo && !cameraVideo.paused) {
          const scaleX = canvas.width / window.innerWidth;
          const scaleY = canvas.height / window.innerHeight;
          const camX = cameraPosition.x * scaleX;
          const camY = cameraPosition.y * scaleY;
          const camSize = cameraSize * Math.min(scaleX, scaleY);
          
          ctx.save();
          if (cameraShape === 'circle') {
            ctx.beginPath();
            ctx.arc(camX + camSize/2, camY + camSize/2, camSize/2, 0, Math.PI * 2);
            ctx.clip();
          }
          ctx.drawImage(cameraVideo, camX, camY, camSize, camSize);
          ctx.restore();
          
          ctx.strokeStyle = isRecording ? '#ff4757' : '#4ecdc4';
          ctx.lineWidth = 4;
          if (cameraShape === 'circle') {
            ctx.beginPath();
            ctx.arc(camX + camSize/2, camY + camSize/2, camSize/2, 0, Math.PI * 2);
            ctx.stroke();
          } else {
            ctx.strokeRect(camX, camY, camSize, camSize);
          }
        }
        
        // Draw whiteboard
        if (showWhiteboard && whiteboardCanvas) {
          ctx.drawImage(whiteboardCanvas, 0, 0, canvas.width, canvas.height);
        }
        
        animationFrameRef.current = requestAnimationFrame(drawFrame);
      };
      
      drawFrame();
      
      const canvasStream = canvas.captureStream(30);
      
      if (audioStream) {
        audioStream.getAudioTracks().forEach(track => canvasStream.addTrack(track));
      }
      
      const systemAudioTracks = screenStream.getAudioTracks();
      if (systemAudioTracks.length > 0) {
        systemAudioTracks.forEach(track => canvasStream.addTrack(track));
      }
      
      const options = { 
        mimeType: 'video/webm;codecs=vp9,opus',
        videoBitsPerSecond: quality.bitrate
      };
      
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm;codecs=vp8,opus';
      }
      
      const mediaRecorder = new MediaRecorder(canvasStream, options);
      mediaRecorderRef.current = mediaRecorder;

      const chunks = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data?.size > 0) chunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        setRecordedChunks([blob]);
        if (recordedVideoRef.current) {
          recordedVideoRef.current.src = URL.createObjectURL(blob);
        }
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);
      
    } catch (err) {
      console.error('Recording error:', err);
      alert('录制失败: ' + err.message);
      stopAllStreams();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    stopAllStreams();
    setIsRecording(false);
    setIsPaused(false);
  };

  const togglePause = () => {
    if (mediaRecorderRef.current) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
      } else {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
      }
    }
  };

  const downloadRecording = () => {
    if (recordedChunks.length > 0) {
      const blob = recordedChunks[0];
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const qualityLabels = { low: '720p', medium: '1080p', high: '1080p-HQ', ultra: '1440p' };
      a.download = `recording-${qualityLabels[videoQuality]}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setShowQualityMenu(false);
    }
  };

  const deleteRecording = () => {
    if (recordedVideoRef.current) recordedVideoRef.current.src = '';
    setRecordedChunks([]);
  };

  const colors = ['#000000', '#ff4757', '#4ecdc4', '#f7b731', '#5f27cd', '#1e90ff', '#2ed573', '#ff6348'];
  const strokeWidths = [1, 2, 4, 8, 12];

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0f0f1e 0%, #1a1a2e 100%)',
      minHeight: '100vh',
      color: '#fff',
      fontFamily: '"Inter", sans-serif',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `radial-gradient(circle at 20% 30%, rgba(255, 71, 87, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 80% 70%, rgba(78, 205, 196, 0.1) 0%, transparent 50%)`,
        pointerEvents: 'none'
      }} />

      <div style={{ position: 'relative', zIndex: 1, padding: '20px' }}>
        {/* Header */}
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          paddingBottom: '15px'
        }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: 700,
            margin: 0,
            background: 'linear-gradient(90deg, #ff4757, #4ecdc4)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            RecStudio Pro
          </h1>
          
          {isRecording && (
            <div style={{
              fontSize: '32px',
              fontWeight: 700,
              color: '#ff4757',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#ff4757',
                animation: 'blink 1s ease-in-out infinite'
              }} />
              {formatTime(recordingTime)}
            </div>
          )}
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '20px' }}>
          {/* Control Panel */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            backdropFilter: 'blur(20px)',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            height: 'fit-content'
          }}>
            <h3 style={{ fontSize: '11px', marginBottom: '12px', textTransform: 'uppercase', opacity: 0.5, letterSpacing: '1px' }}>录制模式</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {[
                { id: 'screen', icon: Monitor, label: '整个屏幕' },
                { id: 'window', icon: Maximize, label: '窗口' },
                { id: 'area', icon: Minimize2, label: '自定义区域' }
              ].map(mode => (
                <button
                  key={mode.id}
                  onClick={() => setRecordingMode(mode.id)}
                  disabled={isRecording}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    background: recordingMode === mode.id ? 'linear-gradient(135deg, #ff4757, #ff6b81)' : 'rgba(255, 255, 255, 0.05)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                    cursor: isRecording ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                    opacity: isRecording && recordingMode !== mode.id ? 0.4 : 1
                  }}
                >
                  <mode.icon size={14} />
                  {mode.label}
                </button>
              ))}
            </div>

            {recordingMode === 'area' && !isRecording && (
              <button
                onClick={startAreaSelection}
                style={{
                  width: '100%',
                  padding: '10px',
                  marginBottom: '15px',
                  background: selectedArea ? 'rgba(78, 205, 196, 0.2)' : 'linear-gradient(135deg, #4ecdc4, #44a3d5)',
                  border: selectedArea ? '1px solid #4ecdc4' : 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '11px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontWeight: 600
                }}
              >
                {selectedArea ? '✓ 区域已选择 - 点击重选' : '🖱️ 选择录制区域'}
              </button>
            )}

            <h3 style={{ fontSize: '11px', marginBottom: '12px', marginTop: '20px', textTransform: 'uppercase', opacity: 0.5, letterSpacing: '1px' }}>选项</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '15px' }}>
              <div style={{
                padding: '10px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px'
              }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', opacity: 0.7 }}>录制质量</label>
                <select
                  value={videoQuality}
                  onChange={(e) => setVideoQuality(e.target.value)}
                  disabled={isRecording}
                  style={{
                    width: '100%',
                    padding: '6px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '11px',
                    cursor: isRecording ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit'
                  }}
                >
                  <option value="low" style={{ background: '#1a1a2e' }}>低清 720p</option>
                  <option value="medium" style={{ background: '#1a1a2e' }}>标清 1080p</option>
                  <option value="high" style={{ background: '#1a1a2e' }}>高清 1080p</option>
                  <option value="ultra" style={{ background: '#1a1a2e' }}>超清 1440p</option>
                </select>
              </div>

              <label style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 10px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '6px',
                fontSize: '11px',
                cursor: isRecording ? 'not-allowed' : 'pointer'
              }}>
                <span>系统音频</span>
                <input type="checkbox" checked={audioEnabled} onChange={(e) => setAudioEnabled(e.target.checked)} disabled={isRecording} />
              </label>

              <label style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 10px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '6px',
                fontSize: '11px',
                cursor: isRecording ? 'not-allowed' : 'pointer'
              }}>
                <span><Mic size={12} style={{ marginRight: '6px', display: 'inline' }} />麦克风</span>
                <input type="checkbox" checked={micEnabled} onChange={(e) => setMicEnabled(e.target.checked)} disabled={isRecording} />
              </label>

              <button
                onClick={() => showCamera ? stopCamera() : startCamera()}
                disabled={isRecording}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px',
                  background: showCamera ? 'linear-gradient(135deg, #4ecdc4, #44a3d5)' : 'rgba(255, 255, 255, 0.05)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#fff',
                  cursor: isRecording ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  fontSize: '11px',
                  fontWeight: showCamera ? 600 : 400
                }}
              >
                <Camera size={12} />
                {showCamera ? '摄像头已开启' : '开启摄像头'}
              </button>

              {showCamera && !isRecording && (
                <div style={{ display: 'flex', gap: '6px', paddingLeft: '8px' }}>
                  <button
                    onClick={() => setCameraShape('circle')}
                    style={{
                      flex: 1,
                      padding: '6px',
                      background: cameraShape === 'circle' ? '#4ecdc4' : 'rgba(255, 255, 255, 0.1)',
                      border: 'none',
                      borderRadius: '4px',
                      color: '#fff',
                      cursor: 'pointer',
                      fontSize: '10px'
                    }}
                  >
                    ⭕ 圆形
                  </button>
                  <button
                    onClick={() => setCameraShape('square')}
                    style={{
                      flex: 1,
                      padding: '6px',
                      background: cameraShape === 'square' ? '#4ecdc4' : 'rgba(255, 255, 255, 0.1)',
                      border: 'none',
                      borderRadius: '4px',
                      color: '#fff',
                      cursor: 'pointer',
                      fontSize: '10px'
                    }}
                  >
                    ⬜ 方形
                  </button>
                </div>
              )}

              <button
                onClick={() => setShowWhiteboard(!showWhiteboard)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px',
                  background: showWhiteboard ? 'linear-gradient(135deg, #f7b731, #f79f1f)' : 'rgba(255, 255, 255, 0.05)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: '11px',
                  fontWeight: showWhiteboard ? 600 : 400
                }}
              >
                <Edit3 size={12} />
                {showWhiteboard ? '白板已开启' : '开启白板'}
              </button>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  style={{
                    padding: '12px',
                    background: 'linear-gradient(135deg, #ff4757, #ff6b81)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 6px 20px rgba(255, 71, 87, 0.4)'
                  }}
                >
                  <Play size={16} fill="#fff" />
                  开始录制
                </button>
              ) : (
                <>
                  <button
                    onClick={togglePause}
                    style={{
                      padding: '12px',
                      background: isPaused ? 'linear-gradient(135deg, #4ecdc4, #44a3d5)' : 'linear-gradient(135deg, #f7b731, #f79f1f)',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    {isPaused ? <><Play size={16} fill="#fff" />继续</> : <><Pause size={16} />暂停</>}
                  </button>
                  <button
                    onClick={stopRecording}
                    style={{
                      padding: '12px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <Square size={16} fill="#fff" />
                    停止
                  </button>
                </>
              )}

              {recordedChunks.length > 0 && !isRecording && (
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                  <div className="quality-menu-container" style={{ flex: 1, position: 'relative' }}>
                    <button
                      onClick={() => setShowQualityMenu(!showQualityMenu)}
                      style={{
                        width: '100%',
                        padding: '10px',
                        background: 'linear-gradient(135deg, #4ecdc4, #44a3d5)',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <Download size={12} />
                      下载
                      <ChevronDown size={12} />
                    </button>
                    
                    {showQualityMenu && (
                      <div style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: 0,
                        right: 0,
                        marginBottom: '6px',
                        background: 'rgba(26, 26, 46, 0.98)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '6px',
                        padding: '6px',
                        zIndex: 1000,
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)'
                      }}>
                        {[
                          { value: 'low', label: '720p' },
                          { value: 'medium', label: '1080p' },
                          { value: 'high', label: '1080p HQ' },
                          { value: 'ultra', label: '1440p' }
                        ].map(q => (
                          <button
                            key={q.value}
                            onClick={() => {
                              setVideoQuality(q.value);
                              downloadRecording();
                            }}
                            style={{
                              width: '100%',
                              padding: '8px',
                              background: videoQuality === q.value ? 'rgba(78, 205, 196, 0.2)' : 'transparent',
                              border: videoQuality === q.value ? '1px solid #4ecdc4' : '1px solid transparent',
                              borderRadius: '4px',
                              color: '#fff',
                              fontSize: '11px',
                              cursor: 'pointer',
                              marginBottom: '2px',
                              textAlign: 'center'
                            }}
                          >
                            {q.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={deleteRecording}
                    style={{
                      padding: '10px',
                      background: 'rgba(255, 71, 87, 0.2)',
                      border: '1px solid rgba(255, 71, 87, 0.4)',
                      borderRadius: '6px',
                      color: '#ff6b81',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Main Area */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            backdropFilter: 'blur(20px)',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            minHeight: '600px'
          }}>
            {recordedChunks.length === 0 ? (
              <div style={{ flex: 1, background: '#000', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                <div style={{ textAlign: 'center', opacity: 0.3, zIndex: 1 }}>
                  <Monitor size={64} strokeWidth={1} />
                  <p style={{ fontSize: '14px', marginTop: '15px' }}>准备录制</p>
                </div>
                
                <canvas
                  ref={whiteboardCanvasRef}
                  width={1920}
                  height={1080}
                  onMouseDown={handleWhiteboardMouseDown}
                  onMouseMove={handleWhiteboardMouseMove}
                  onMouseUp={handleWhiteboardMouseUp}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    cursor: showWhiteboard ? (whiteboardTool === 'pan' ? 'grab' : whiteboardTool === 'text' ? 'text' : 'crosshair') : 'default',
                    pointerEvents: showWhiteboard ? 'auto' : 'none',
                    zIndex: 2
                  }}
                />
              </div>
            ) : (
              <video
                ref={recordedVideoRef}
                controls
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '8px',
                  background: '#000'
                }}
              />
            )}

            {showWhiteboard && recordedChunks.length === 0 && (
              <div style={{
                marginTop: '15px',
                padding: '12px',
                background: '#fff',
                borderRadius: '8px',
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap',
                alignItems: 'center'
              }}>
                {/* Tools */}
                <div style={{ display: 'flex', gap: '4px', borderRight: '1px solid #ddd', paddingRight: '8px' }}>
                  {[
                    { id: 'select', icon: MousePointer },
                    { id: 'pan', icon: Hand },
                    { id: 'pencil', icon: Edit3 },
                    { id: 'line', icon: Minus },
                    { id: 'arrow', icon: ArrowRight },
                    { id: 'rectangle', icon: Square },
                    { id: 'circle', icon: CircleIcon },
                    { id: 'text', icon: Type },
                    { id: 'eraser', icon: Eraser }
                  ].map(tool => (
                    <button
                      key={tool.id}
                      onClick={() => setWhiteboardTool(tool.id)}
                      style={{
                        padding: '6px',
                        background: whiteboardTool === tool.id ? '#4ecdc4' : '#f5f5f5',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <tool.icon size={14} color={whiteboardTool === tool.id ? '#fff' : '#333'} />
                    </button>
                  ))}
                </div>

                {/* Colors */}
                <div style={{ display: 'flex', gap: '4px', borderRight: '1px solid #ddd', paddingRight: '8px' }}>
                  {colors.map(color => (
                    <button
                      key={color}
                      onClick={() => setStrokeColor(color)}
                      style={{
                        width: '24px',
                        height: '24px',
                        background: color,
                        border: strokeColor === color ? '2px solid #333' : '1px solid #ddd',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        padding: 0
                      }}
                    />
                  ))}
                </div>

                {/* Stroke widths */}
                <div style={{ display: 'flex', gap: '4px', borderRight: '1px solid #ddd', paddingRight: '8px' }}>
                  {strokeWidths.map(width => (
                    <button
                      key={width}
                      onClick={() => setStrokeWidth(width)}
                      style={{
                        padding: '6px 10px',
                        background: strokeWidth === width ? '#4ecdc4' : '#f5f5f5',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '10px',
                        color: strokeWidth === width ? '#fff' : '#333'
                      }}
                    >
                      {width}px
                    </button>
                  ))}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button onClick={undo} disabled={historyStep <= 0} style={{
                    padding: '6px',
                    background: '#f5f5f5',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: historyStep <= 0 ? 'not-allowed' : 'pointer',
                    opacity: historyStep <= 0 ? 0.5 : 1
                  }}>
                    <Undo size={14} color="#333" />
                  </button>
                  <button onClick={redo} disabled={historyStep >= history.length - 1} style={{
                    padding: '6px',
                    background: '#f5f5f5',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: historyStep >= history.length - 1 ? 'not-allowed' : 'pointer',
                    opacity: historyStep >= history.length - 1 ? 0.5 : 1
                  }}>
                    <Redo size={14} color="#333" />
                  </button>
                  <button onClick={clearWhiteboard} style={{
                    padding: '6px 10px',
                    background: '#ff4757',
                    border: 'none',
                    borderRadius: '4px',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '10px',
                    fontWeight: 600
                  }}>
                    清空
                  </button>
                </div>
              </div>
            )}

            {/* Text input */}
            {textPosition && (
              <div style={{
                position: 'fixed',
                left: textPosition.x,
                top: textPosition.y,
                zIndex: 10000,
                background: '#fff',
                padding: '8px',
                borderRadius: '6px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
              }}>
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleTextSubmit()}
                  autoFocus
                  placeholder="输入文本..."
                  style={{
                    padding: '6px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '12px',
                    minWidth: '150px'
                  }}
                />
                <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                  <button onClick={handleTextSubmit} style={{
                    flex: 1,
                    padding: '4px',
                    background: '#4ecdc4',
                    border: 'none',
                    borderRadius: '3px',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '10px'
                  }}>确定</button>
                  <button onClick={() => { setTextPosition(null); setTextInput(''); }} style={{
                    flex: 1,
                    padding: '4px',
                    background: '#ddd',
                    border: 'none',
                    borderRadius: '3px',
                    color: '#333',
                    cursor: 'pointer',
                    fontSize: '10px'
                  }}>取消</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Area Selection Overlay */}
      {isSelectingArea && (
        <div
          ref={areaSelectionRef}
          onMouseDown={handleAreaMouseDown}
          onMouseMove={handleAreaMouseMove}
          onMouseUp={handleAreaMouseUp}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            cursor: 'crosshair',
            zIndex: 10000
          }}
        >
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#fff',
            padding: '12px 24px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            color: '#333',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            🖱️ 拖动鼠标选择录制区域
            <button
              onClick={() => setIsSelectingArea(false)}
              style={{
                padding: '4px 10px',
                background: '#ff4757',
                border: 'none',
                borderRadius: '4px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              取消
            </button>
          </div>
          
          {selectionStart && selectionEnd && (
            <div style={{
              position: 'absolute',
              left: Math.min(selectionStart.x, selectionEnd.x),
              top: Math.min(selectionStart.y, selectionEnd.y),
              width: Math.abs(selectionEnd.x - selectionStart.x),
              height: Math.abs(selectionEnd.y - selectionStart.y),
              border: '3px solid #4ecdc4',
              background: 'rgba(78, 205, 196, 0.1)',
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)'
            }}>
              <div style={{
                position: 'absolute',
                bottom: '-35px',
                right: '0',
                background: '#4ecdc4',
                padding: '6px 10px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 600,
                color: '#fff'
              }}>
                {Math.round(Math.abs(selectionEnd.x - selectionStart.x))} × {Math.round(Math.abs(selectionEnd.y - selectionStart.y))} px
              </div>
            </div>
          )}
        </div>
      )}

      {/* Camera Overlay */}
      {showCamera && cameraStream && (
        <div
          onMouseDown={handleCameraMouseDown}
          style={{
            position: 'fixed',
            left: `${cameraPosition.x}px`,
            top: `${cameraPosition.y}px`,
            width: `${cameraSize}px`,
            height: `${cameraSize}px`,
            borderRadius: cameraShape === 'circle' ? '50%' : '8px',
            overflow: 'hidden',
            border: isRecording ? '3px solid #ff4757' : '3px solid #4ecdc4',
            boxShadow: isRecording 
              ? '0 8px 32px rgba(255, 71, 87, 0.6)' 
              : '0 8px 32px rgba(78, 205, 196, 0.6)',
            cursor: isDraggingCamera ? 'grabbing' : 'grab',
            zIndex: 1000,
            background: '#000',
            userSelect: 'none'
          }}
        >
          <video
            ref={cameraVideoRef}
            autoPlay
            muted
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: 'scaleX(-1)'
            }}
          />
          <div style={{
            position: 'absolute',
            top: '6px',
            right: '6px',
            background: isRecording ? 'rgba(255, 71, 87, 0.9)' : 'rgba(0, 0, 0, 0.7)',
            borderRadius: '4px',
            padding: '4px 8px',
            fontSize: '9px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <Move size={8} />
            拖动
          </div>
          {isRecording && (
            <div style={{
              position: 'absolute',
              bottom: '6px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(255, 71, 87, 0.9)',
              borderRadius: '4px',
              padding: '3px 6px',
              fontSize: '8px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '3px'
            }}>
              <div style={{
                width: '4px',
                height: '4px',
                borderRadius: '50%',
                background: '#fff',
                animation: 'blink 1.5s ease-in-out infinite'
              }} />
              REC
            </div>
          )}
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        button:hover:not(:disabled) {
          filter: brightness(1.1);
        }
        
        button:active:not(:disabled) {
          transform: scale(0.98);
        }
        
        input, select {
          font-family: inherit;
        }
        
        input:focus, select:focus {
          outline: none;
        }
      `}</style>
    </div>
  );
};

export default ScreenRecorder;
