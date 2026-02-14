import React, { useState, useRef, useEffect } from 'react';
import { Camera, Square, Monitor, Maximize, Edit3, Play, Pause, Download, Trash2, Settings, Mic, MicOff, Video, VideoOff, Circle, Move, Layers, Wand2, Globe, FileText, Workflow } from 'lucide-react';

const ScreenRecorder = () => {
  const [recordingMode, setRecordingMode] = useState('screen'); // screen, window, area, camera
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [whiteboardContent, setWhiteboardContent] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [cameraShape, setCameraShape] = useState('circle'); // circle or square
  const [cameraPosition, setCameraPosition] = useState({ x: 20, y: 20 });
  const [isDraggingCamera, setIsDraggingCamera] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedArea, setSelectedArea] = useState(null);
  const [isSelectingArea, setIsSelectingArea] = useState(false);
  const [backgroundRemoval, setBackgroundRemoval] = useState(false);
  const [whiteboardMode, setWhiteboardMode] = useState('text'); // text, pointer, ai
  const [aiPrompt, setAiPrompt] = useState('');
  const [flowchartData, setFlowchartData] = useState(null);
  const [embeddedUrl, setEmbeddedUrl] = useState('');
  
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const videoPreviewRef = useRef(null);
  const cameraVideoRef = useRef(null);
  const timerRef = useRef(null);
  const canvasRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0 });

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

  // Format time
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
          height: { ideal: 720 }
        }, 
        audio: false 
      });
      cameraStreamRef.current = stream;
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
      }
      setShowCamera(true);
    } catch (err) {
      console.error('Error accessing camera:', err);
      alert('无法访问摄像头，请检查权限设置');
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(track => track.stop());
      cameraStreamRef.current = null;
    }
    setShowCamera(false);
  };

  // Start recording
  const startRecording = async () => {
    try {
      let stream;
      
      if (recordingMode === 'screen') {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: { 
            cursor: 'always',
            displaySurface: 'monitor'
          },
          audio: audioEnabled
        });
      } else if (recordingMode === 'window') {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: { 
            cursor: 'always',
            displaySurface: 'window'
          },
          audio: audioEnabled
        });
      } else if (recordingMode === 'area') {
        // For custom area, we still use display media but will crop in post-processing
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' },
          audio: audioEnabled
        });
      } else if (recordingMode === 'camera') {
        stream = await navigator.mediaDevices.getUserMedia({
          video: videoEnabled,
          audio: audioEnabled
        });
      }

      streamRef.current = stream;
      
      const options = { mimeType: 'video/webm;codecs=vp8,opus' };
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      const chunks = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        setRecordedChunks([blob]);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
    } catch (err) {
      console.error('Error starting recording:', err);
      alert('无法开始录制，请检查权限设置');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);
    setIsPaused(false);
  };

  // Pause/Resume recording
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

  // Download recording
  const downloadRecording = () => {
    if (recordedChunks.length > 0) {
      const blob = recordedChunks[0];
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recording-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Delete recording
  const deleteRecording = () => {
    setRecordedChunks([]);
    setRecordingTime(0);
  };

  // Camera drag handlers
  const handleCameraMouseDown = (e) => {
    setIsDraggingCamera(true);
    dragStartRef.current = {
      x: e.clientX - cameraPosition.x,
      y: e.clientY - cameraPosition.y
    };
  };

  const handleMouseMove = (e) => {
    if (isDraggingCamera) {
      setCameraPosition({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y
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

  // Generate flowchart from AI
  const generateFlowchart = () => {
    // Simulated AI-generated flowchart
    const nodes = [
      { id: 1, text: '开始', x: 200, y: 50, type: 'start' },
      { id: 2, text: aiPrompt || '处理步骤', x: 200, y: 150, type: 'process' },
      { id: 3, text: '决策点', x: 200, y: 250, type: 'decision' },
      { id: 4, text: '结束', x: 200, y: 350, type: 'end' }
    ];
    setFlowchartData(nodes);
  };

  return (
    <div 
      className="screen-recorder"
      style={{
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)',
        minHeight: '100vh',
        color: '#fff',
        fontFamily: '"Space Mono", monospace',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Background decoration */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `
          radial-gradient(circle at 20% 30%, rgba(255, 71, 87, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 80% 70%, rgba(78, 205, 196, 0.1) 0%, transparent 50%)
        `,
        pointerEvents: 'none'
      }} />

      <div style={{ position: 'relative', zIndex: 1, padding: '40px' }}>
        {/* Header */}
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '40px',
          borderBottom: '2px solid rgba(255, 255, 255, 0.1)',
          paddingBottom: '20px'
        }}>
          <div>
            <h1 style={{
              fontSize: '42px',
              fontWeight: 700,
              margin: 0,
              background: 'linear-gradient(90deg, #ff4757, #4ecdc4)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-1px'
            }}>
              RecStudio
            </h1>
            <p style={{ 
              margin: '8px 0 0 0', 
              opacity: 0.6, 
              fontSize: '14px',
              letterSpacing: '2px'
            }}>
              专业录屏工具
            </p>
          </div>
          
          {isRecording && (
            <div style={{
              fontSize: '36px',
              fontWeight: 700,
              color: '#ff4757',
              display: 'flex',
              alignItems: 'center',
              gap: '15px',
              animation: 'pulse 2s ease-in-out infinite'
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }}>
          {/* Left Panel - Controls */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
            padding: '30px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <h2 style={{ 
              fontSize: '20px', 
              marginBottom: '25px',
              fontWeight: 600,
              letterSpacing: '1px'
            }}>
              录制模式
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '30px' }}>
              {[
                { id: 'screen', icon: Monitor, label: '整个屏幕' },
                { id: 'window', icon: Maximize, label: '选定窗口' },
                { id: 'area', icon: Square, label: '自定义区域' },
                { id: 'camera', icon: Camera, label: '摄像头' }
              ].map(mode => (
                <button
                  key={mode.id}
                  onClick={() => setRecordingMode(mode.id)}
                  disabled={isRecording}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '15px 20px',
                    background: recordingMode === mode.id 
                      ? 'linear-gradient(135deg, #ff4757, #ff6b81)' 
                      : 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid ' + (recordingMode === mode.id ? '#ff4757' : 'rgba(255, 255, 255, 0.1)'),
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '14px',
                    cursor: isRecording ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s ease',
                    fontFamily: 'inherit',
                    opacity: isRecording && recordingMode !== mode.id ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!isRecording) {
                      e.currentTarget.style.transform = 'translateX(5px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <mode.icon size={20} />
                  <span>{mode.label}</span>
                </button>
              ))}
            </div>

            <h2 style={{ 
              fontSize: '20px', 
              marginBottom: '25px',
              fontWeight: 600,
              letterSpacing: '1px'
            }}>
              功能选项
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {/* Audio toggle */}
              <button
                onClick={() => setAudioEnabled(!audioEnabled)}
                disabled={isRecording}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '15px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  color: '#fff',
                  cursor: isRecording ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  fontSize: '14px'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {audioEnabled ? <Mic size={18} /> : <MicOff size={18} />}
                  音频录制
                </span>
                <div style={{
                  width: '50px',
                  height: '26px',
                  background: audioEnabled ? '#4ecdc4' : 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '13px',
                  position: 'relative',
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{
                    width: '22px',
                    height: '22px',
                    background: '#fff',
                    borderRadius: '50%',
                    position: 'absolute',
                    top: '2px',
                    left: audioEnabled ? '26px' : '2px',
                    transition: 'all 0.3s ease'
                  }} />
                </div>
              </button>

              {/* Video toggle */}
              <button
                onClick={() => setVideoEnabled(!videoEnabled)}
                disabled={isRecording}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '15px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  color: '#fff',
                  cursor: isRecording ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  fontSize: '14px'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {videoEnabled ? <Video size={18} /> : <VideoOff size={18} />}
                  视频录制
                </span>
                <div style={{
                  width: '50px',
                  height: '26px',
                  background: videoEnabled ? '#4ecdc4' : 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '13px',
                  position: 'relative',
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{
                    width: '22px',
                    height: '22px',
                    background: '#fff',
                    borderRadius: '50%',
                    position: 'absolute',
                    top: '2px',
                    left: videoEnabled ? '26px' : '2px',
                    transition: 'all 0.3s ease'
                  }} />
                </div>
              </button>

              {/* Camera overlay */}
              <button
                onClick={() => showCamera ? stopCamera() : startCamera()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '15px',
                  background: showCamera ? 'linear-gradient(135deg, #4ecdc4, #44a3d5)' : 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid ' + (showCamera ? '#4ecdc4' : 'rgba(255, 255, 255, 0.1)'),
                  borderRadius: '12px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: '14px'
                }}
              >
                <Camera size={18} />
                {showCamera ? '关闭摄像头' : '打开摄像头'}
              </button>

              {/* Camera shape toggle */}
              {showCamera && (
                <div style={{
                  padding: '15px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <p style={{ fontSize: '12px', marginBottom: '10px', opacity: 0.7 }}>摄像头形状</p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => setCameraShape('circle')}
                      style={{
                        flex: 1,
                        padding: '10px',
                        background: cameraShape === 'circle' ? '#4ecdc4' : 'rgba(255, 255, 255, 0.1)',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px'
                      }}
                    >
                      <Circle size={14} />
                      圆形
                    </button>
                    <button
                      onClick={() => setCameraShape('square')}
                      style={{
                        flex: 1,
                        padding: '10px',
                        background: cameraShape === 'square' ? '#4ecdc4' : 'rgba(255, 255, 255, 0.1)',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px'
                      }}
                    >
                      <Square size={14} />
                      方形
                    </button>
                  </div>
                </div>
              )}

              {/* Whiteboard */}
              <button
                onClick={() => setShowWhiteboard(!showWhiteboard)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '15px',
                  background: showWhiteboard ? 'linear-gradient(135deg, #f7b731, #f79f1f)' : 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid ' + (showWhiteboard ? '#f7b731' : 'rgba(255, 255, 255, 0.1)'),
                  borderRadius: '12px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: '14px'
                }}
              >
                <Edit3 size={18} />
                {showWhiteboard ? '关闭白板' : '打开白板'}
              </button>
            </div>

            {/* Recording controls */}
            <div style={{ marginTop: '30px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    padding: '18px',
                    background: 'linear-gradient(135deg, #ff4757, #ff6b81)',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '16px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 10px 30px rgba(255, 71, 87, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 15px 40px rgba(255, 71, 87, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 10px 30px rgba(255, 71, 87, 0.3)';
                  }}
                >
                  <Play size={20} fill="#fff" />
                  开始录制
                </button>
              ) : (
                <>
                  <button
                    onClick={togglePause}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '12px',
                      padding: '18px',
                      background: isPaused ? 'linear-gradient(135deg, #4ecdc4, #44a3d5)' : 'linear-gradient(135deg, #f7b731, #f79f1f)',
                      border: 'none',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '16px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'inherit'
                    }}
                  >
                    {isPaused ? <Play size={20} fill="#fff" /> : <Pause size={20} />}
                    {isPaused ? '继续' : '暂停'}
                  </button>
                  <button
                    onClick={stopRecording}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '12px',
                      padding: '18px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '16px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'inherit'
                    }}
                  >
                    <Square size={20} />
                    停止录制
                  </button>
                </>
              )}

              {recordedChunks.length > 0 && (
                <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                  <button
                    onClick={downloadRecording}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '15px',
                      background: 'linear-gradient(135deg, #4ecdc4, #44a3d5)',
                      border: 'none',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '14px',
                      cursor: 'pointer',
                      fontFamily: 'inherit'
                    }}
                  >
                    <Download size={18} />
                    下载
                  </button>
                  <button
                    onClick={deleteRecording}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '15px',
                      background: 'rgba(255, 71, 87, 0.2)',
                      border: '1px solid rgba(255, 71, 87, 0.5)',
                      borderRadius: '12px',
                      color: '#ff4757',
                      fontSize: '14px',
                      cursor: 'pointer',
                      fontFamily: 'inherit'
                    }}
                  >
                    <Trash2 size={18} />
                    删除
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Preview */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
            padding: '30px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            position: 'relative',
            minHeight: '600px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <h2 style={{ 
              fontSize: '20px', 
              marginBottom: '25px',
              fontWeight: 600,
              letterSpacing: '1px'
            }}>
              预览区域
            </h2>

            <div style={{
              flex: 1,
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden',
              border: '2px dashed rgba(255, 255, 255, 0.2)'
            }}>
              {recordedChunks.length === 0 ? (
                <div style={{ textAlign: 'center', opacity: 0.5 }}>
                  <Monitor size={64} style={{ marginBottom: '20px', opacity: 0.5 }} />
                  <p style={{ fontSize: '18px' }}>准备开始录制</p>
                  <p style={{ fontSize: '14px', marginTop: '10px' }}>选择录制模式并点击开始录制按钮</p>
                </div>
              ) : (
                <video
                  ref={videoPreviewRef}
                  src={URL.createObjectURL(recordedChunks[0])}
                  controls
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    borderRadius: '8px'
                  }}
                />
              )}

              {/* Camera overlay */}
              {showCamera && (
                <div
                  onMouseDown={handleCameraMouseDown}
                  style={{
                    position: 'absolute',
                    left: `${cameraPosition.x}px`,
                    top: `${cameraPosition.y}px`,
                    width: '200px',
                    height: '200px',
                    borderRadius: cameraShape === 'circle' ? '50%' : '12px',
                    overflow: 'hidden',
                    border: '4px solid #4ecdc4',
                    boxShadow: '0 10px 40px rgba(78, 205, 196, 0.5)',
                    cursor: isDraggingCamera ? 'grabbing' : 'grab',
                    zIndex: 10,
                    background: '#000'
                  }}
                >
                  <video
                    ref={cameraVideoRef}
                    autoPlay
                    muted
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transform: backgroundRemoval ? 'scaleX(-1)' : 'none'
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    top: '5px',
                    right: '5px',
                    background: 'rgba(0, 0, 0, 0.7)',
                    borderRadius: '6px',
                    padding: '5px 8px',
                    fontSize: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}>
                    <Move size={12} />
                    拖动
                  </div>
                </div>
              )}
            </div>

            {/* Whiteboard panel */}
            {showWhiteboard && (
              <div style={{
                marginTop: '20px',
                background: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '12px',
                padding: '20px',
                border: '1px solid rgba(0, 0, 0, 0.1)'
              }}>
                <div style={{ 
                  display: 'flex', 
                  gap: '10px', 
                  marginBottom: '15px',
                  borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
                  paddingBottom: '15px'
                }}>
                  <button
                    onClick={() => setWhiteboardMode('text')}
                    style={{
                      padding: '8px 15px',
                      background: whiteboardMode === 'text' ? '#4ecdc4' : 'rgba(0, 0, 0, 0.05)',
                      border: 'none',
                      borderRadius: '8px',
                      color: whiteboardMode === 'text' ? '#fff' : '#000',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <FileText size={16} />
                    文本
                  </button>
                  <button
                    onClick={() => setWhiteboardMode('pointer')}
                    style={{
                      padding: '8px 15px',
                      background: whiteboardMode === 'pointer' ? '#4ecdc4' : 'rgba(0, 0, 0, 0.05)',
                      border: 'none',
                      borderRadius: '8px',
                      color: whiteboardMode === 'pointer' ? '#fff' : '#000',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Edit3 size={16} />
                    指示
                  </button>
                  <button
                    onClick={() => setWhiteboardMode('ai')}
                    style={{
                      padding: '8px 15px',
                      background: whiteboardMode === 'ai' ? '#4ecdc4' : 'rgba(0, 0, 0, 0.05)',
                      border: 'none',
                      borderRadius: '8px',
                      color: whiteboardMode === 'ai' ? '#fff' : '#000',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Wand2 size={16} />
                    AI工具
                  </button>
                  <button
                    onClick={() => setWhiteboardMode('embed')}
                    style={{
                      padding: '8px 15px',
                      background: whiteboardMode === 'embed' ? '#4ecdc4' : 'rgba(0, 0, 0, 0.05)',
                      border: 'none',
                      borderRadius: '8px',
                      color: whiteboardMode === 'embed' ? '#fff' : '#000',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Globe size={16} />
                    嵌入
                  </button>
                </div>

                {whiteboardMode === 'text' && (
                  <textarea
                    value={whiteboardContent}
                    onChange={(e) => setWhiteboardContent(e.target.value)}
                    placeholder="在此输入白板内容..."
                    style={{
                      width: '100%',
                      minHeight: '120px',
                      padding: '12px',
                      background: '#fff',
                      border: '1px solid rgba(0, 0, 0, 0.1)',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      color: '#000',
                      resize: 'vertical'
                    }}
                  />
                )}

                {whiteboardMode === 'pointer' && (
                  <div style={{
                    background: '#fff',
                    border: '2px dashed rgba(0, 0, 0, 0.2)',
                    borderRadius: '8px',
                    minHeight: '120px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#666',
                    fontSize: '14px'
                  }}>
                    使用光标在屏幕上进行指示和讲解
                  </div>
                )}

                {whiteboardMode === 'ai' && (
                  <div>
                    <div style={{ marginBottom: '15px' }}>
                      <input
                        type="text"
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder="输入自然语言描述，AI将生成流程图..."
                        style={{
                          width: '100%',
                          padding: '12px',
                          background: '#fff',
                          border: '1px solid rgba(0, 0, 0, 0.1)',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontFamily: 'inherit',
                          color: '#000'
                        }}
                      />
                    </div>
                    <button
                      onClick={generateFlowchart}
                      style={{
                        padding: '10px 20px',
                        background: 'linear-gradient(135deg, #4ecdc4, #44a3d5)',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontFamily: 'inherit',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <Workflow size={16} />
                      生成流程图
                    </button>
                    
                    {flowchartData && (
                      <div style={{
                        marginTop: '15px',
                        background: '#f8f9fa',
                        borderRadius: '8px',
                        padding: '20px',
                        minHeight: '200px'
                      }}>
                        <svg width="100%" height="400" style={{ background: '#fff', borderRadius: '8px' }}>
                          {flowchartData.map((node, idx) => (
                            <g key={node.id}>
                              {idx < flowchartData.length - 1 && (
                                <line
                                  x1={node.x}
                                  y1={node.y + 30}
                                  x2={flowchartData[idx + 1].x}
                                  y2={flowchartData[idx + 1].y - 30}
                                  stroke="#4ecdc4"
                                  strokeWidth="2"
                                  markerEnd="url(#arrowhead)"
                                />
                              )}
                              <rect
                                x={node.x - 80}
                                y={node.y - 25}
                                width="160"
                                height="50"
                                fill={node.type === 'start' ? '#4ecdc4' : node.type === 'end' ? '#ff4757' : '#f7b731'}
                                stroke="#333"
                                strokeWidth="2"
                                rx={node.type === 'start' || node.type === 'end' ? '25' : '8'}
                              />
                              <text
                                x={node.x}
                                y={node.y + 5}
                                textAnchor="middle"
                                fill="#fff"
                                fontSize="14"
                                fontWeight="600"
                              >
                                {node.text}
                              </text>
                            </g>
                          ))}
                          <defs>
                            <marker
                              id="arrowhead"
                              markerWidth="10"
                              markerHeight="10"
                              refX="9"
                              refY="3"
                              orient="auto"
                            >
                              <polygon points="0 0, 10 3, 0 6" fill="#4ecdc4" />
                            </marker>
                          </defs>
                        </svg>
                      </div>
                    )}
                  </div>
                )}

                {whiteboardMode === 'embed' && (
                  <div>
                    <input
                      type="text"
                      value={embeddedUrl}
                      onChange={(e) => setEmbeddedUrl(e.target.value)}
                      placeholder="输入要嵌入的网页URL..."
                      style={{
                        width: '100%',
                        padding: '12px',
                        background: '#fff',
                        border: '1px solid rgba(0, 0, 0, 0.1)',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontFamily: 'inherit',
                        color: '#000',
                        marginBottom: '15px'
                      }}
                    />
                    {embeddedUrl && (
                      <div style={{
                        background: '#f8f9fa',
                        borderRadius: '8px',
                        padding: '15px',
                        minHeight: '200px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#666',
                        fontSize: '14px'
                      }}>
                        <Globe size={32} style={{ marginRight: '10px', opacity: 0.5 }} />
                        嵌入内容: {embeddedUrl}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        
        * {
          box-sizing: border-box;
        }
        
        button:active {
          transform: scale(0.98);
        }
        
        input:focus, textarea:focus {
          outline: none;
          border-color: #4ecdc4;
          box-shadow: 0 0 0 3px rgba(78, 205, 196, 0.1);
        }
      `}</style>
    </div>
  );
};

export default ScreenRecorder;