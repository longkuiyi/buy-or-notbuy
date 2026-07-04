import { useState, useRef } from 'react';
import { Send, Camera, Image, X } from 'lucide-react';
import { validateImage, fileToBase64 } from '../services/api';
import './ChatInput.css';

interface ChatInputProps {
  onSend: (text: string, imageFile?: File) => void;
  disabled: boolean;
  placeholder?: string;
  onOpenCamera?: (onCapture: (file: File) => void) => void;
}

export function ChatInput({
  onSend,
  disabled,
  placeholder = '追问细节、对比竞品、问价格走势...',
  onOpenCamera
}: ChatInputProps) {
  const [text, setText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;
    if (!text.trim() && !imageFile) return;
    onSend(text.trim(), imageFile || undefined);
    setText('');
    setImageFile(null);
    setImagePreview(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = validateImage(file);
    if (!validation.valid) {
      return;
    }
    setImageFile(file);
    const base64 = await fileToBase64(file);
    setImagePreview(base64);
  };

  const handleCameraClick = () => {
    onOpenCamera?.((file) => {
      setImageFile(file);
      fileToBase64(file).then(setImagePreview);
    });
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <form onSubmit={handleSubmit} className="chat-input-form">
      <div className="chat-input-wrapper">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="chat-input"
        />
        <div className="chat-input-actions">
          <button
            type="button"
            onClick={handleCameraClick}
            disabled={disabled}
            className={`chat-image-btn ${imageFile ? 'active' : ''}`}
            title="拍照"
          >
            <Camera size={18} />
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className={`chat-image-btn ${imageFile ? 'active' : ''}`}
            title="上传图片"
          >
            <Image size={18} />
          </button>
        </div>
      </div>
      <button type="submit" disabled={disabled || (!text.trim() && !imageFile)} className="chat-send-btn">
        <Send size={18} />
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleImageChange}
        className="file-input"
      />
      {imagePreview && (
        <div className="chat-image-preview">
          <img src={imagePreview} alt="追问图片预览" />
          <button type="button" onClick={clearImage} className="clear-image-btn">
            <X size={12} />
          </button>
        </div>
      )}
    </form>
  );
}
