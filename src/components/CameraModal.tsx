import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Camera, RotateCcw } from 'lucide-react';
import type { AnalysisMode } from '../types';
import './CameraModal.css';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
  mode: AnalysisMode;
}

type QualityLevel = 'sd' | 'hd' | 'fhd';

const QUALITY_PRESETS: Record<QualityLevel, { width: number; height: number; label: string }> = {
  sd: { width: 640, height: 480, label: '标清' },
  hd: { width: 1280, height: 720, label: '高清' },
  fhd: { width: 1920, height: 1080, label: '超清' }
};

async function tryGetResolution(width: number, height: number): Promise<number> {
  let stream: MediaStream | null = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: width },
        height: { ideal: height },
        facingMode: 'environment'
      },
      audio: false
    });
    const track = stream.getVideoTracks()[0];
    const settings = track.getSettings();
    return settings.width || 0;
  } catch {
    return 0;
  } finally {
    stream?.getTracks().forEach((t) => t.stop());
  }
}

export function CameraModal({ isOpen, onClose, onCapture, mode }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [quality, setQuality] = useState<QualityLevel>('hd');
  const [maxQuality, setMaxQuality] = useState<QualityLevel>('fhd');
  const [detected, setDetected] = useState(false);
  const [error, setError] = useState<string>('');

  const detectMaxQuality = useCallback(async () => {
    setDetected(false);
    const fhdWidth = await tryGetResolution(1920, 1080);
    if (fhdWidth >= 1920) {
      setMaxQuality('fhd');
      setDetected(true);
      return;
    }
    const hdWidth = await tryGetResolution(1280, 720);
    if (hdWidth >= 1280) {
      setMaxQuality('hd');
      if (quality === 'fhd') setQuality('hd');
      setDetected(true);
      return;
    }
    const sdWidth = await tryGetResolution(640, 480);
    if (sdWidth > 0) {
      setMaxQuality('sd');
      if (quality !== 'sd') setQuality('sd');
    } else {
      setMaxQuality('sd');
    }
    setDetected(true);
  }, [quality]);

  const startCamera = useCallback(async () => {
    setError('');
    const preset = QUALITY_PRESETS[quality];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: preset.width },
          height: { ideal: preset.height },
          facingMode: 'environment'
        },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError('无法启动摄像头，请检查权限或改用相册上传。');
    }
  }, [quality]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let active = true;
    if (isOpen) {
      detectMaxQuality().then(() => {
        if (active) startCamera();
      });
    } else {
      stopCamera();
      setCapturedImage(null);
      setError('');
      setDetected(false);
    }
    return () => {
      active = false;
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera, detectMaxQuality]);

  useEffect(() => {
    if (!isOpen) return;
    stopCamera();
    startCamera();
  }, [quality, isOpen, startCamera, stopCamera]);

  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setCapturedImage(canvas.toDataURL('image/jpeg', 0.92));
    stopCamera();
  };

  const handleConfirm = () => {
    if (!capturedImage) return;
    fetch(capturedImage)
      .then((res) => res.blob())
      .then((blob) => {
        const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
        onCapture(file);
        setCapturedImage(null);
      });
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const modeText = mode === 'pk' ? '多商品 PK' : mode === 'budget' ? '预算选商品' : '单商品分析';

  if (!isOpen) return null;

  return (
    <div className="camera-modal-overlay" onClick={onClose}>
      <div className="camera-modal" onClick={(e) => e.stopPropagation()}>
        <div className="camera-modal-header">
          <h3>拍照 - {modeText}</h3>
          <button type="button" className="camera-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="camera-quality">
          <span>清晰度：</span>
          {(Object.keys(QUALITY_PRESETS) as QualityLevel[]).map((level) => (
            <button
              key={level}
              type="button"
              className={`quality-btn ${quality === level ? 'active' : ''} ${QUALITY_PRESETS[level].width > QUALITY_PRESETS[maxQuality].width ? 'disabled' : ''}`}
              onClick={() => setQuality(level)}
              disabled={QUALITY_PRESETS[level].width > QUALITY_PRESETS[maxQuality].width || !detected}
            >
              {QUALITY_PRESETS[level].label}
            </button>
          ))}
          <span className="quality-hint">
            {detected ? `设备最高支持 ${QUALITY_PRESETS[maxQuality].label}` : '检测中…'}
          </span>
        </div>

        <div className="camera-preview">
          {error ? (
            <div className="camera-error">{error}</div>
          ) : capturedImage ? (
            <img src={capturedImage} alt="拍摄结果" />
          ) : (
            <video ref={videoRef} autoPlay playsInline muted />
          )}
        </div>

        <div className="camera-actions">
          {capturedImage ? (
            <>
              <button type="button" className="camera-btn secondary" onClick={handleRetake}>
                <RotateCcw size={16} />
                重拍
              </button>
              <button type="button" className="camera-btn primary" onClick={handleConfirm}>
                <Camera size={16} />
                使用照片
              </button>
            </>
          ) : (
            <button
              type="button"
              className="camera-btn primary"
              onClick={handleCapture}
              disabled={!!error || !detected}
            >
              <Camera size={16} />
              拍照
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
