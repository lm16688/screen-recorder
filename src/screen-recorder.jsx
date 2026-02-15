import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Square, Monitor, Maximize, Edit3, Play, Pause, Download, Trash2, Mic, MicOff, Video, VideoOff, Circle, Move, X, Minimize2, Hand, MousePointer, Type, Minus, ArrowRight, Eraser, Palette, Undo, Redo } from 'lucide-react';

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
  const [cameraPosition, setCameraPosition] = useState({ x: 20, y: 20 });
  const [isDraggingCamera, setIsDraggingCamera] = useState(false);
  
  // Area selection states
  const [isSelectingArea, setIsSelectingArea] = useState(false);
  const [selectionStart, setSelectionStart] = useState(null);
  const [selectionEnd, setSelectionEnd] = useState(null);
  const [selectedArea, setSelectedArea] = useState(null);
  
  // Whiteboard states
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [whiteboardTool, setWhiteboardTool] = useState('pan'); // pan, select, draw, line, arrow, rectangle, circle, text, eraser
  const [drawingColor, setDrawingColor] = useState('#ff4757');
  const [drawingWidth, setDrawingWidth] = useState(3);
  const [elements, setElements] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentElement, setCurrentElement] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyStep, setHistoryStep] = useState(0);
  const [selectedElement, setSelectedElement] = useState(null);
  const [textInput, setTextInput] = useState('');
  const [textPosition, setTextPosition] = useState(null);
  
  // Settings
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [videoQuality, setVideoQuality] = useState('high'); // low, medium, high, ultra
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  
  // Refs
  const mediaRecorderRef = useRef(null);
  const screenStreamRef = useRef(null);
  const cameraVideoRef = useRef(null);
  const recordedVideoRef = useRef(null);
  const timerRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const whiteboardCanvasRef = useRef(null);
  const whiteboardOverlayRef = useRef(null);
  const areaSelectionRef = useRef(null);
  const combinedCanvasRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Timer effect
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording, isPaused]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllStreams();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

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

  // Start camera
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
      alert('无法访问摄像头');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  // Area selection handlers
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
    setSelectionEnd(null);
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

  const cancelAreaSelection = () => {
    setIsSelectingArea(false);
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  // Whiteboard drawing functions
  const drawWhiteboardElements = () => {
    const canvas = whiteboardCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    elements.forEach(element => {
      ctx.strokeStyle = element.color;
      ctx.fillStyle = element.color;
      ctx.lineWidth = element.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      switch (element.type) {
        case 'draw':
          ctx.beginPath();
          element.points.forEach((point, index) => {
            if (index === 0) {
              ctx.moveTo(point.x, point.y);
            } else {
              ctx.lineTo(point.x, point.y);
            }
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
          // Draw line
          ctx.beginPath();
          ctx.moveTo(element.x1, element.y1);
          ctx.lineTo(element.x2, element.y2);
          ctx.stroke();
          
          // Draw arrowhead
          const angle = Math.atan2(element.y2 - element.y1, element.x2 - element.x1);
          const headLength = 15;
          ctx.beginPath();
          ctx.moveTo(element.x2, element.y2);
          ctx.lineTo(
            element.x2 - headLength * Math.cos(angle - Math.PI / 6),
            element.y2 - headLength * Math.sin(angle - Math.PI / 6)
          );
          ctx.moveTo(element.x2, element.y2);
          ctx.lineTo(
            element.x2 - headLength * Math.cos(angle + Math.PI / 6),
            element.y2 - headLength * Math.sin(angle + Math.PI / 6)
          );
          ctx.stroke();
          break;
          
        case 'rectangle':
          ctx.strokeRect(element.x, element.y, element.width, element.height);
          break;
          
        case 'circle':
          ctx.beginPath();
          const radius = Math.sqrt(
            Math.pow(element.width, 2) + Math.pow(element.height, 2)
          ) / 2;
          ctx.arc(
            element.x + element.width / 2,
            element.y + element.height / 2,
            radius,
            0,
            2 * Math.PI
          );
          ctx.stroke();
          break;
          
        case 'text':
          ctx.font = `${element.fontSize}px Arial`;
          ctx.fillText(element.text, element.x, element.y);
          break;
      }
    });
  };

  useEffect(() => {
    drawWhiteboardElements();
  }, [elements]);

  const handleWhiteboardMouseDown = (e) => {
    if (!showWhiteboard || whiteboardTool === 'pan') return;
    
    const canvas = whiteboardCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDrawing(true);
    
    if (whiteboardTool === 'text') {
      setTextPosition({ x, y });
      setTextInput('');
      return;
    }
    
    const newElement = {
      id: Date.now(),
      type: whiteboardTool,
      color: drawingColor,
      width: drawingWidth,
      x,
      y
    };
    
    if (whiteboardTool === 'draw') {
      newElement.points = [{ x, y }];
    } else if (whiteboardTool === 'line' || whiteboardTool === 'arrow') {
      newElement.x1 = x;
      newElement.y1 = y;
      newElement.x2 = x;
      newElement.y2 = y;
    } else if (whiteboardTool === 'rectangle' || whiteboardTool === 'circle') {
      newElement.width = 0;
      newElement.height = 0;
    }
    
    setCurrentElement(newElement);
  };

  const handleWhiteboardMouseMove = (e) => {
    if (!isDrawing || !currentElement || whiteboardTool === 'pan') return;
    
    const canvas = whiteboardCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const updated = { ...currentElement };
    
    if (whiteboardTool === 'draw') {
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
      const newElements = [...elements];
      const index = newElements.findIndex(e => e.id === currentElement.id);
      if (index >= 0) {
        newElements[index] = currentElement;
      } else {
        newElements.push(currentElement);
      }
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
        color: drawingColor,
        fontSize: 20
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
      setElements(history[historyStep - 1] || []);
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

  // Start recording with area selection and whiteboard overlay
  const startRecording = async () => {
    try {
      let screenStream;
      
      if (recordingMode === 'area' && !selectedArea) {
        alert('请先选择要录制的区域');
        return;
      }
      
      // Get quality settings
      const qualitySettings = {
        low: { width: 1280, height: 720, bitrate: 2500000 },
        medium: { width: 1920, height: 1080, bitrate: 5000000 },
        high: { width: 1920, height: 1080, bitrate: 8000000 },
        ultra: { width: 2560, height: 1440, bitrate: 12000000 }
      };
      
      const quality = qualitySettings[videoQuality];
      
      // Get screen stream
      if (recordingMode === 'screen') {
        screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { 
            cursor: 'always',
            width: { ideal: quality.width },
            height: { ideal: quality.height }
          },
          audio: audioEnabled
        });
      } else if (recordingMode === 'window') {
        screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { 
            cursor: 'always',
            displaySurface: 'window',
            width: { ideal: quality.width },
            height: { ideal: quality.height }
          },
          audio: audioEnabled
        });
      } else if (recordingMode === 'area') {
        screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { 
            cursor: 'always',
            width: { ideal: quality.width },
            height: { ideal: quality.height }
          },
          audio: audioEnabled
        });
      } else if (recordingMode === 'camera') {
        screenStream = await navigator.mediaDevices.getUserMedia({
          video: videoEnabled ? {
            width: { ideal: quality.width },
            height: { ideal: quality.height }
          } : false,
          audio: false
        });
      }

      // Get microphone if enabled
      let audioStream = null;
      if (micEnabled && recordingMode !== 'camera') {
        try {
          audioStream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          });
        } catch (err) {
          console.warn('Could not access microphone:', err);
        }
      }

      screenStreamRef.current = screenStream;
      
      // Create combined canvas for overlay elements
      const canvas = combinedCanvasRef.current;
      if (!canvas) {
        const newCanvas = document.createElement('canvas');
        newCanvas.width = quality.width;
        newCanvas.height = quality.height;
        combinedCanvasRef.current = newCanvas;
      } else {
        canvas.width = quality.width;
        canvas.height = quality.height;
      }
      
      const combinedCanvas = combinedCanvasRef.current;
      const ctx = combinedCanvas.getContext('2d');
      
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
        if (!screenVideo.paused && !screenVideo.ended) {
          // Draw screen
          if (recordingMode === 'area' && selectedArea) {
            // Crop to selected area
            const scaleX = screenVideo.videoWidth / areaSelectionRef.current.offsetWidth;
            const scaleY = screenVideo.videoHeight / areaSelectionRef.current.offsetHeight;
            ctx.drawImage(
              screenVideo,
              selectedArea.x * scaleX,
              selectedArea.y * scaleY,
              selectedArea.width * scaleX,
              selectedArea.height * scaleY,
              0, 0, combinedCanvas.width, combinedCanvas.height
            );
          } else {
            ctx.drawImage(screenVideo, 0, 0, combinedCanvas.width, combinedCanvas.height);
          }
          
          // Draw camera overlay with current position
          if (cameraVideo && !cameraVideo.paused) {
            const camWidth = 300;
            const camHeight = 300;
            // Scale camera position to canvas
            const scaleX = combinedCanvas.width / window.innerWidth;
            const scaleY = combinedCanvas.height / window.innerHeight;
            const camX = cameraPosition.x * scaleX;
            const camY = cameraPosition.y * scaleY;
            
            ctx.save();
            if (cameraShape === 'circle') {
              ctx.beginPath();
              ctx.arc(camX + camWidth/2, camY + camHeight/2, camWidth/2, 0, Math.PI * 2);
              ctx.clip();
            }
            ctx.drawImage(cameraVideo, camX, camY, camWidth, camHeight);
            ctx.restore();
            
            ctx.strokeStyle = '#4ecdc4';
            ctx.lineWidth = 4;
            if (cameraShape === 'circle') {
              ctx.beginPath();
              ctx.arc(camX + camWidth/2, camY + camHeight/2, camWidth/2, 0, Math.PI * 2);
              ctx.stroke();
            } else {
              ctx.strokeRect(camX, camY, camWidth, camHeight);
            }
          }
          
          // Draw whiteboard overlay
          if (showWhiteboard && whiteboardCanvas) {
            ctx.drawImage(whiteboardCanvas, 0, 0, combinedCanvas.width, combinedCanvas.height);
          }
          
          animationFrameRef.current = requestAnimationFrame(drawFrame);
        }
      };
      
      drawFrame();
      
      const canvasStream = combinedCanvas.captureStream(30);
      
      // Add audio tracks
      if (audioStream) {
        audioStream.getAudioTracks().forEach(track => canvasStream.addTrack(track));
      }
      
      const systemAudioTracks = screenStream.getAudioTracks();
      if (systemAudioTracks.length > 0) {
        systemAudioTracks.forEach(track => canvasStream.addTrack(track));
      }
      
      // Create MediaRecorder with quality settings
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
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
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
      console.error('Error starting recording:', err);
      alert('无法开始录制: ' + err.message);
      stopAllStreams();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
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
      
      // Get quality label
      const qualityLabels = {
        low: '720p',
        medium: '1080p',
        high: '1080p-HQ',
        ultra: '1440p'
      };
      const qualityLabel = qualityLabels[videoQuality] || '1080p';
      
      a.download = `recording-${qualityLabel}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setShowQualityMenu(false);
    }
  };

  const deleteRecording = () => {
    if (recordedVideoRef.current) {
      recordedVideoRef.current.src = '';
    }
    setRecordedChunks([]);
    setRecordingTime(0);
  };

  // Camera drag - allow during recording
  const handleCameraMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingCamera(true);
    dragStartRef.current = {
      x: e.clientX - cameraPosition.x,
      y: e.clientY - cameraPosition.y
    };
  };

  const handleMouseMove = (e) => {
    if (isDraggingCamera) {
      const maxX = window.innerWidth - 220;
      const maxY = window.innerHeight - 220;
      setCameraPosition({
        x: Math.max(0, Math.min(maxX, e.clientX - dragStartRef.current.x)),
        y: Math.max(0, Math.min(maxY, e.clientY - dragStartRef.current.y))
      });
    }
  };

  const handleMouseUp = () => {
    setIsDraggingCamera(false);
  };

  useEffect(() => {
    if (isDraggingCamera) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingCamera]);

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

  const colors = ['#ff4757', '#4ecdc4', '#f7b731', '#5f27cd', '#00d2d3', '#ff6348', '#1e90ff', '#2ed573'];

  return (
    <div 
      style={{
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)',
        minHeight: '100vh',
        color: '#fff',
        fontFamily: '"Inter", -apple-system, sans-serif',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `
          radial-gradient(circle at 20% 30%, rgba(255, 71, 87, 0.15) 0%, transparent 50%),
          radial-gradient(circle at 80% 70%, rgba(78, 205, 196, 0.15) 0%, transparent 50%)
        `,
        pointerEvents: 'none',
        zIndex: 0
      }} />

      <div style={{ position: 'relative', zIndex: 1, padding: '30px' }}>
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '30px',
          borderBottom: '2px solid rgba(255, 255, 255, 0.1)',
          paddingBottom: '20px'
        }}>
          <div>
            <h1 style={{
              fontSize: '48px',
              fontWeight: 700,
              margin: 0,
              background: 'linear-gradient(90deg, #ff4757, #4ecdc4)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-2px'
            }}>
              RecStudio Pro
            </h1>
          </div>
          
          {isRecording && (
            <div style={{
              fontSize: '42px',
              fontWeight: 700,
              color: '#ff4757',
              display: 'flex',
              alignItems: 'center',
              gap: '15px'
            }}>
              <div style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                background: '#ff4757',
                animation: 'pulse 1.5s ease-in-out infinite'
              }} />
              {formatTime(recordingTime)}
            </div>
          )}
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '30px' }}>
          {/* Control Panel */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            backdropFilter: 'blur(20px)',
            borderRadius: '16px',
            padding: '25px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            height: 'fit-content'
          }}>
            <h3 style={{ fontSize: '12px', marginBottom: '15px', textTransform: 'uppercase', opacity: 0.6, letterSpacing: '1px' }}>
              录制模式
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '25px' }}>
              {[
                { id: 'screen', icon: Monitor, label: '整个屏幕' },
                { id: 'window', icon: Maximize, label: '窗口' },
                { id: 'area', icon: Minimize2, label: '自定义区域' },
                { id: 'camera', icon: Camera, label: '摄像头' }
              ].map(mode => (
                <button
                  key={mode.id}
                  onClick={() => setRecordingMode(mode.id)}
                  disabled={isRecording}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 16px',
                    background: recordingMode === mode.id 
                      ? 'linear-gradient(135deg, #ff4757, #ff6b81)' 
                      : 'rgba(255, 255, 255, 0.05)',
                    border: 'none',
                    borderRadius: '10px',
                    color: '#fff',
                    fontSize: '13px',
                    cursor: isRecording ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    fontFamily: 'inherit',
                    opacity: isRecording && recordingMode !== mode.id ? 0.4 : 1
                  }}
                >
                  <mode.icon size={16} />
                  {mode.label}
                </button>
              ))}
            </div>

            {recordingMode === 'area' && !isRecording && (
              <button
                onClick={startAreaSelection}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: selectedArea ? 'rgba(78, 205, 196, 0.2)' : 'linear-gradient(135deg, #4ecdc4, #44a3d5)',
                  border: selectedArea ? '1px solid #4ecdc4' : 'none',
                  borderRadius: '10px',
                  color: '#fff',
                  fontSize: '13px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  marginBottom: '20px',
                  fontWeight: 600
                }}
              >
                {selectedArea ? '✓ 区域已选择' : '选择录制区域'}
              </button>
            )}

            <h3 style={{ fontSize: '12px', marginBottom: '15px', marginTop: '25px', textTransform: 'uppercase', opacity: 0.6, letterSpacing: '1px' }}>
              选项
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Video Quality Selector */}
              <div style={{
                padding: '10px 12px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                fontSize: '12px'
              }}>
                <label style={{ display: 'block', marginBottom: '8px', opacity: 0.8 }}>录制质量</label>
                <select
                  value={videoQuality}
                  onChange={(e) => setVideoQuality(e.target.value)}
                  disabled={isRecording}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '12px',
                    cursor: isRecording ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit'
                  }}
                >
                  <option value="low" style={{ background: '#1a1a2e', color: '#fff' }}>低清 720p (2.5Mbps)</option>
                  <option value="medium" style={{ background: '#1a1a2e', color: '#fff' }}>标清 1080p (5Mbps)</option>
                  <option value="high" style={{ background: '#1a1a2e', color: '#fff' }}>高清 1080p (8Mbps)</option>
                  <option value="ultra" style={{ background: '#1a1a2e', color: '#fff' }}>超清 1440p (12Mbps)</option>
                </select>
              </div>
              
              <label style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                cursor: isRecording ? 'not-allowed' : 'pointer',
                fontSize: '12px'
              }}>
                <span>系统音频</span>
                <input
                  type="checkbox"
                  checked={audioEnabled}
                  onChange={(e) => setAudioEnabled(e.target.checked)}
                  disabled={isRecording}
                  style={{ width: '16px', height: '16px' }}
                />
              </label>

              <label style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                cursor: isRecording ? 'not-allowed' : 'pointer',
                fontSize: '12px'
              }}>
                <span><Mic size={14} style={{ display: 'inline', marginRight: '6px' }} />麦克风</span>
                <input
                  type="checkbox"
                  checked={micEnabled}
                  onChange={(e) => setMicEnabled(e.target.checked)}
                  disabled={isRecording}
                  style={{ width: '16px', height: '16px' }}
                />
              </label>

              <button
                onClick={() => showCamera ? stopCamera() : startCamera()}
                disabled={isRecording}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px',
                  background: showCamera ? 'linear-gradient(135deg, #4ecdc4, #44a3d5)' : 'rgba(255, 255, 255, 0.05)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  cursor: isRecording ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  fontSize: '12px',
                  fontWeight: showCamera ? 600 : 400
                }}
              >
                <Camera size={14} />
                {showCamera ? '摄像头开启' : '摄像头叠加'}
              </button>

              {showCamera && !isRecording && (
                <div style={{ display: 'flex', gap: '6px', paddingLeft: '10px' }}>
                  <button
                    onClick={() => setCameraShape('circle')}
                    style={{
                      flex: 1,
                      padding: '8px',
                      background: cameraShape === 'circle' ? '#4ecdc4' : 'rgba(255, 255, 255, 0.1)',
                      border: 'none',
                      borderRadius: '6px',
                      color: '#fff',
                      cursor: 'pointer',
                      fontSize: '11px'
                    }}
                  >
                    ⭕
                  </button>
                  <button
                    onClick={() => setCameraShape('square')}
                    style={{
                      flex: 1,
                      padding: '8px',
                      background: cameraShape === 'square' ? '#4ecdc4' : 'rgba(255, 255, 255, 0.1)',
                      border: 'none',
                      borderRadius: '6px',
                      color: '#fff',
                      cursor: 'pointer',
                      fontSize: '11px'
                    }}
                  >
                    ⬜
                  </button>
                </div>
              )}

              <button
                onClick={() => setShowWhiteboard(!showWhiteboard)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px',
                  background: showWhiteboard ? 'linear-gradient(135deg, #f7b731, #f79f1f)' : 'rgba(255, 255, 255, 0.05)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: '12px',
                  fontWeight: showWhiteboard ? 600 : 400
                }}
              >
                <Edit3 size={14} />
                {showWhiteboard ? '白板开启' : '白板工具'}
              </button>
            </div>

            <div style={{ marginTop: '25px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  style={{
                    padding: '14px',
                    background: 'linear-gradient(135deg, #ff4757, #ff6b81)',
                    border: 'none',
                    borderRadius: '10px',
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    boxShadow: '0 8px 24px rgba(255, 71, 87, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px'
                  }}
                >
                  <Play size={18} fill="#fff" />
                  开始录制
                </button>
              ) : (
                <>
                  <button
                    onClick={togglePause}
                    style={{
                      padding: '14px',
                      background: isPaused ? 'linear-gradient(135deg, #4ecdc4, #44a3d5)' : 'linear-gradient(135deg, #f7b731, #f79f1f)',
                      border: 'none',
                      borderRadius: '10px',
                      color: '#fff',
                      fontSize: '14px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px'
                    }}
                  >
                    {isPaused ? <><Play size={18} fill="#fff" />继续</> : <><Pause size={18} />暂停</>}
                  </button>
                  <button
                    onClick={stopRecording}
                    style={{
                      padding: '14px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '10px',
                      color: '#fff',
                      fontSize: '14px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px'
                    }}
                  >
                    <Square size={18} fill="#fff" />
                    停止
                  </button>
                </>
              )}

              {recordedChunks.length > 0 && !isRecording && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <div className="quality-menu-container" style={{ flex: 1, position: 'relative' }}>
                    <button
                      onClick={() => setShowQualityMenu(!showQualityMenu)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        background: 'linear-gradient(135deg, #4ecdc4, #44a3d5)',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <Download size={14} />
                      下载视频
                    </button>
                    
                    {showQualityMenu && (
                      <div style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: 0,
                        right: 0,
                        marginBottom: '8px',
                        background: 'rgba(26, 26, 46, 0.98)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        padding: '8px',
                        zIndex: 1000,
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
                      }}>
                        <div style={{ fontSize: '10px', opacity: 0.6, marginBottom: '8px', paddingLeft: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                          选择质量
                        </div>
                        {[
                          { value: 'low', label: '低清 720p', size: '较小文件' },
                          { value: 'medium', label: '标清 1080p', size: '推荐' },
                          { value: 'high', label: '高清 1080p', size: '高质量' },
                          { value: 'ultra', label: '超清 1440p', size: '最佳质量' }
                        ].map(quality => (
                          <button
                            key={quality.value}
                            onClick={() => {
                              setVideoQuality(quality.value);
                              downloadRecording();
                            }}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              background: videoQuality === quality.value ? 'rgba(78, 205, 196, 0.2)' : 'transparent',
                              border: videoQuality === quality.value ? '1px solid #4ecdc4' : '1px solid transparent',
                              borderRadius: '6px',
                              color: '#fff',
                              fontSize: '12px',
                              cursor: 'pointer',
                              marginBottom: '4px',
                              textAlign: 'left',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              if (videoQuality !== quality.value) {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (videoQuality !== quality.value) {
                                e.currentTarget.style.background = 'transparent';
                              }
                            }}
                          >
                            <span>{quality.label}</span>
                            <span style={{ fontSize: '10px', opacity: 0.6 }}>{quality.size}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={deleteRecording}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: 'rgba(255, 71, 87, 0.2)',
                      border: '1px solid rgba(255, 71, 87, 0.4)',
                      borderRadius: '8px',
                      color: '#ff6b81',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <Trash2 size={14} />
                    删除
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Main Area */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            backdropFilter: 'blur(20px)',
            borderRadius: '16px',
            padding: '25px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            minHeight: '600px'
          }}>
            {recordedChunks.length === 0 ? (
              <div style={{ flex: 1, background: '#000', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                <div style={{ textAlign: 'center', opacity: 0.4, zIndex: 1 }}>
                  <Monitor size={80} strokeWidth={1} />
                  <p style={{ fontSize: '16px', marginTop: '20px' }}>准备录制</p>
                </div>
                
                {/* Whiteboard canvas - always present when enabled */}
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
                    cursor: showWhiteboard ? (whiteboardTool === 'pan' ? 'grab' : 'crosshair') : 'default',
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
                  objectFit: 'contain',
                  borderRadius: '12px',
                  background: '#000'
                }}
              />
            )}

            {/* Whiteboard toolbar */}
            {showWhiteboard && recordedChunks.length === 0 && (
              <div style={{
                marginTop: '20px',
                padding: '15px',
                background: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '12px',
                display: 'flex',
                gap: '10px',
                flexWrap: 'wrap',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', gap: '6px', borderRight: '1px solid #ddd', paddingRight: '10px' }}>
                  {[
                    { id: 'pan', icon: Hand, label: '移动' },
                    { id: 'select', icon: MousePointer, label: '选择' },
                    { id: 'draw', icon: Edit3, label: '画笔' },
                    { id: 'line', icon: Minus, label: '直线' },
                    { id: 'arrow', icon: ArrowRight, label: '箭头' },
                    { id: 'rectangle', icon: Square, label: '矩形' },
                    { id: 'circle', icon: Circle, label: '圆形' },
                    { id: 'text', icon: Type, label: '文本' },
                    { id: 'eraser', icon: Eraser, label: '橡皮' }
                  ].map(tool => (
                    <button
                      key={tool.id}
                      onClick={() => setWhiteboardTool(tool.id)}
                      title={tool.label}
                      style={{
                        padding: '8px',
                        background: whiteboardTool === tool.id ? '#4ecdc4' : '#f5f5f5',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                      }}
                    >
                      <tool.icon size={16} color={whiteboardTool === tool.id ? '#fff' : '#333'} />
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '6px', borderRight: '1px solid #ddd', paddingRight: '10px' }}>
                  {colors.map(color => (
                    <button
                      key={color}
                      onClick={() => setDrawingColor(color)}
                      style={{
                        width: '28px',
                        height: '28px',
                        background: color,
                        border: drawingColor === color ? '3px solid #333' : '2px solid #ddd',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        padding: 0
                      }}
                    />
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '6px', borderRight: '1px solid #ddd', paddingRight: '10px' }}>
                  <button
                    onClick={undo}
                    disabled={historyStep <= 0}
                    title="撤销"
                    style={{
                      padding: '8px',
                      background: '#f5f5f5',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: historyStep <= 0 ? 'not-allowed' : 'pointer',
                      opacity: historyStep <= 0 ? 0.5 : 1
                    }}
                  >
                    <Undo size={16} color="#333" />
                  </button>
                  <button
                    onClick={redo}
                    disabled={historyStep >= history.length - 1}
                    title="重做"
                    style={{
                      padding: '8px',
                      background: '#f5f5f5',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: historyStep >= history.length - 1 ? 'not-allowed' : 'pointer',
                      opacity: historyStep >= history.length - 1 ? 0.5 : 1
                    }}
                  >
                    <Redo size={16} color="#333" />
                  </button>
                </div>

                <button
                  onClick={clearWhiteboard}
                  style={{
                    padding: '8px 12px',
                    background: '#ff4757',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 600
                  }}
                >
                  清空
                </button>
              </div>
            )}

            {/* Text input overlay */}
            {textPosition && (
              <div style={{
                position: 'fixed',
                left: textPosition.x,
                top: textPosition.y,
                zIndex: 1000,
                background: '#fff',
                padding: '10px',
                borderRadius: '8px',
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
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                    minWidth: '200px'
                  }}
                />
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                  <button
                    onClick={handleTextSubmit}
                    style={{
                      flex: 1,
                      padding: '6px',
                      background: '#4ecdc4',
                      border: 'none',
                      borderRadius: '4px',
                      color: '#fff',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    确定
                  </button>
                  <button
                    onClick={() => {
                      setTextPosition(null);
                      setTextInput('');
                    }}
                    style={{
                      flex: 1,
                      padding: '6px',
                      background: '#ddd',
                      border: 'none',
                      borderRadius: '4px',
                      color: '#333',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    取消
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Area selection overlay */}
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
            padding: '15px 30px',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: 600,
            color: '#333',
            display: 'flex',
            alignItems: 'center',
            gap: '15px'
          }}>
            拖动鼠标选择录制区域
            <button
              onClick={cancelAreaSelection}
              style={{
                padding: '6px 12px',
                background: '#ff4757',
                border: 'none',
                borderRadius: '6px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              取消
            </button>
          </div>
          
          {selectionStart && selectionEnd && (
            <div
              style={{
                position: 'absolute',
                left: Math.min(selectionStart.x, selectionEnd.x),
                top: Math.min(selectionStart.y, selectionEnd.y),
                width: Math.abs(selectionEnd.x - selectionStart.x),
                height: Math.abs(selectionEnd.y - selectionStart.y),
                border: '3px solid #4ecdc4',
                background: 'rgba(78, 205, 196, 0.1)',
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)'
              }}
            >
              <div style={{
                position: 'absolute',
                bottom: '-40px',
                right: '0',
                background: '#4ecdc4',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#fff'
              }}>
                {Math.round(Math.abs(selectionEnd.x - selectionStart.x))} × {Math.round(Math.abs(selectionEnd.y - selectionStart.y))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Camera overlay */}
      {showCamera && cameraStream && (
        <div
          onMouseDown={handleCameraMouseDown}
          style={{
            position: 'fixed',
            left: `${cameraPosition.x}px`,
            top: `${cameraPosition.y}px`,
            width: '200px',
            height: '200px',
            borderRadius: cameraShape === 'circle' ? '50%' : '12px',
            overflow: 'hidden',
            border: isRecording ? '4px solid #ff4757' : '4px solid #4ecdc4',
            boxShadow: isRecording 
              ? '0 12px 48px rgba(255, 71, 87, 0.6), 0 0 0 2px rgba(255, 71, 87, 0.2)' 
              : '0 12px 48px rgba(78, 205, 196, 0.6)',
            cursor: isDraggingCamera ? 'grabbing' : 'grab',
            zIndex: 1000,
            background: '#000',
            userSelect: 'none',
            transition: 'border-color 0.3s, box-shadow 0.3s'
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
            top: '8px',
            right: '8px',
            background: isRecording ? 'rgba(255, 71, 87, 0.9)' : 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(10px)',
            borderRadius: '6px',
            padding: '6px 10px',
            fontSize: '10px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            animation: isRecording ? 'pulse 2s ease-in-out infinite' : 'none'
          }}>
            <Move size={10} />
            {isRecording ? '拖动移动' : '拖动'}
          </div>
          {isRecording && (
            <div style={{
              position: 'absolute',
              bottom: '8px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(255, 71, 87, 0.9)',
              backdropFilter: 'blur(10px)',
              borderRadius: '6px',
              padding: '4px 8px',
              fontSize: '9px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              whiteSpace: 'nowrap'
            }}>
              <div style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#fff',
                animation: 'pulse 1.5s ease-in-out infinite'
              }} />
              录制中
            </div>
          )}
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.95); }
        }
        
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        button {
          transition: all 0.2s ease;
        }
        
        button:hover:not(:disabled) {
          filter: brightness(1.1);
          transform: translateY(-1px);
        }
        
        button:active:not(:disabled) {
          transform: scale(0.98);
        }
        
        input:focus {
          outline: none;
          border-color: #4ecdc4 !important;
        }
        
        input[type="checkbox"] {
          accent-color: #4ecdc4;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default ScreenRecorder;
