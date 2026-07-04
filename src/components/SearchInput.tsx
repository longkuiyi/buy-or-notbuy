import { useState, useRef } from 'react';
import { Search, X, Swords, Sparkles, Zap, Square, Brain, Wallet, Camera, Image } from 'lucide-react';
import type { ThinkingMode } from '../services/api';
import type { AnalysisMode } from '../types';
import './SearchInput.css';

interface SearchInputProps {
  onAnalyze: (params: {
    mode: AnalysisMode;
    text?: string;
    products?: string[];
    productImages?: (File | null)[];
    budget?: number;
    category?: string;
    imageFile?: File;
  }) => void;
  onStop?: () => void;
  isAnalyzing: boolean;
  thinkingMode: ThinkingMode;
  onThinkingModeChange?: (mode: ThinkingMode) => void;
  onOpenCamera?: (mode: AnalysisMode, onCapture: (file: File) => void) => void;
}

const PRESETS = ['iPhone', '扫地机器人', 'iPad'];
const PK_PRESETS = [
  ['iPhone 15 Pro Max', 'iPhone 16 Pro', '小米 14 Ultra'],
  ['AirPods Pro 2', 'AirPods 4', 'Sony WF-1000XM5'],
  ['MacBook Air M3', 'ThinkPad X1', '华为 MateBook X Pro']
];
const BUDGET_PRESETS = [
  { budget: 3000, category: '手机' },
  { budget: 5000, category: '手机' },
  { budget: 8000, category: '笔记本' }
];

export function SearchInput({
  onAnalyze,
  onStop,
  isAnalyzing,
  thinkingMode,
  onThinkingModeChange,
  onOpenCamera
}: SearchInputProps) {
  const [mode, setMode] = useState<AnalysisMode>('single');
  const [text, setText] = useState('');
  const [pkInputs, setPkInputs] = useState<string[]>(['', '']);
  const [pkImages, setPkImages] = useState<(File | null)[]>([null, null]);
  const [pkPreviews, setPkPreviews] = useState<(string | null)[]>([null, null]);
  const [budget, setBudget] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [budgetImage, setBudgetImage] = useState<File | null>(null);
  const [budgetPreview, setBudgetPreview] = useState<string | null>(null);
  const [singleImage, setSingleImage] = useState<File | null>(null);
  const [singlePreview, setSinglePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFileTarget, setPendingFileTarget] = useState<{
    type: 'single' | 'budget' | number;
  } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAnalyzing) return;

    if (mode === 'pk') {
      const validProducts = pkInputs.map((s) => s.trim()).filter(Boolean);
      if (validProducts.length >= 2) {
        onAnalyze({
          mode: 'pk',
          products: pkInputs.map((s) => s.trim()),
          productImages: pkImages
        });
      }
      return;
    }

    if (mode === 'budget') {
      const budgetValue = parseFloat(budget);
      if (budgetValue > 0) {
        onAnalyze({
          mode: 'budget',
          budget: budgetValue,
          category: category.trim(),
          imageFile: budgetImage || undefined
        });
      }
      return;
    }

    if (text.trim() || singleImage) {
      onAnalyze({ mode: 'single', text, imageFile: singleImage || undefined });
    }
  };

  const handlePreset = (preset: string) => {
    if (isAnalyzing) return;
    setText(preset);
    onAnalyze({ mode: 'single', text: preset });
  };

  const handlePKPreset = (products: string[]) => {
    if (isAnalyzing) return;
    setPkInputs(products);
    setPkImages(products.map(() => null));
    setPkPreviews(products.map(() => null));
    onAnalyze({ mode: 'pk', products });
  };

  const handleBudgetPreset = (preset: { budget: number; category: string }) => {
    if (isAnalyzing) return;
    setBudget(String(preset.budget));
    setCategory(preset.category);
    onAnalyze({
      mode: 'budget',
      budget: preset.budget,
      category: preset.category
    });
  };

  const loadImagePreview = (file: File, callback: (url: string) => void) => {
    const reader = new FileReader();
    reader.onload = () => callback(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingFileTarget) return;

    if (pendingFileTarget.type === 'single') {
      setSingleImage(file);
      loadImagePreview(file, setSinglePreview);
    } else if (pendingFileTarget.type === 'budget') {
      setBudgetImage(file);
      loadImagePreview(file, setBudgetPreview);
    } else if (typeof pendingFileTarget.type === 'number') {
      const index = pendingFileTarget.type;
      setPkImages((prev) => {
        const next = [...prev];
        next[index] = file;
        return next;
      });
      loadImagePreview(file, (url) => {
        setPkPreviews((prev) => {
          const next = [...prev];
          next[index] = url;
          return next;
        });
      });
    }
    setPendingFileTarget(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openFilePicker = (target: { type: 'single' | 'budget' | number }) => {
    setPendingFileTarget(target);
    fileInputRef.current?.click();
  };

  const handleCameraCapture = (target: { type: 'single' | 'budget' | number }) => {
    onOpenCamera?.(mode, (file) => {
      if (target.type === 'single') {
        setSingleImage(file);
        loadImagePreview(file, setSinglePreview);
      } else if (target.type === 'budget') {
        setBudgetImage(file);
        loadImagePreview(file, setBudgetPreview);
      } else if (typeof target.type === 'number') {
        const index = target.type;
        setPkImages((prev) => {
          const next = [...prev];
          next[index] = file;
          return next;
        });
        loadImagePreview(file, (url) => {
          setPkPreviews((prev) => {
            const next = [...prev];
            next[index] = url;
            return next;
          });
        });
      }
    });
  };

  const clearSingleImage = () => {
    setSingleImage(null);
    setSinglePreview(null);
  };

  const clearBudgetImage = () => {
    setBudgetImage(null);
    setBudgetPreview(null);
  };

  const clearPKImage = (index: number) => {
    setPkImages((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
    setPkPreviews((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
  };

  const updatePKInput = (index: number, value: string) => {
    setPkInputs((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const addPKInput = () => {
    if (pkInputs.length < 5) {
      setPkInputs((prev) => [...prev, '']);
      setPkImages((prev) => [...prev, null]);
      setPkPreviews((prev) => [...prev, null]);
    }
  };

  const removePKInput = (index: number) => {
    if (pkInputs.length > 2) {
      setPkInputs((prev) => prev.filter((_, i) => i !== index));
      setPkImages((prev) => prev.filter((_, i) => i !== index));
      setPkPreviews((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const canSubmit =
    mode === 'pk'
      ? pkInputs.filter((s) => s.trim()).length >= 2
      : mode === 'budget'
        ? budget.trim() !== '' && parseFloat(budget) > 0
        : text.trim() || !!singleImage;

  const switchMode = (newMode: AnalysisMode) => {
    setMode(newMode);
  };

  const ImageActionButtons = ({
    target,
    active
  }: {
    target: { type: 'single' | 'budget' | number };
    active?: boolean;
  }) => (
    <>
      <button
        type="button"
        onClick={() => handleCameraCapture(target)}
        disabled={isAnalyzing}
        className={`image-action-btn ${active ? 'active' : ''}`}
        title="拍照"
      >
        <Camera size={18} />
      </button>
      <button
        type="button"
        onClick={() => openFilePicker(target)}
        disabled={isAnalyzing}
        className={`image-action-btn ${active ? 'active' : ''}`}
        title="上传图片"
      >
        <Image size={18} />
      </button>
    </>
  );

  return (
    <div className="search-input-section">
      <div className="mode-switch">
        <button
          type="button"
          className={`mode-btn ${mode === 'single' ? 'active' : ''}`}
          onClick={() => switchMode('single')}
          disabled={isAnalyzing}
        >
          单商品分析
        </button>
        <button
          type="button"
          className={`mode-btn ${mode === 'pk' ? 'active' : ''}`}
          onClick={() => switchMode('pk')}
          disabled={isAnalyzing}
        >
          <Swords size={14} />
          多商品 PK
        </button>
        <button
          type="button"
          className={`mode-btn ${mode === 'budget' ? 'active' : ''}`}
          onClick={() => switchMode('budget')}
          disabled={isAnalyzing}
        >
          <Wallet size={14} />
          预算选商品
        </button>
      </div>

      <form onSubmit={handleSubmit} className="search-form">
        {mode === 'single' && (
          <>
            <div className="input-wrapper">
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="输入商品名称，例如：iPhone 15 Pro Max"
                disabled={isAnalyzing}
                className="text-input"
              />
              <div className="input-actions">
                <ImageActionButtons target={{ type: 'single' }} active={!!singleImage} />
              </div>
            </div>
            {singlePreview && (
              <div className="image-preview">
                <img src={singlePreview} alt="预览" />
                <button type="button" onClick={clearSingleImage} className="clear-image-btn">
                  <X size={14} />
                </button>
              </div>
            )}
          </>
        )}

        {mode === 'pk' && (
          <div className="pk-inputs">
            {pkInputs.map((value, index) => (
              <div key={index} className="pk-input-row">
                <span className="pk-input-index">{index + 1}</span>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => updatePKInput(index, e.target.value)}
                  placeholder={`候选商品 ${index + 1}`}
                  disabled={isAnalyzing}
                  className="pk-input"
                />
                <div className="pk-input-actions">
                  <button
                    type="button"
                    onClick={() => handleCameraCapture({ type: index })}
                    disabled={isAnalyzing}
                    className={`pk-image-btn ${pkImages[index] ? 'active' : ''}`}
                    title="拍照"
                  >
                    <Camera size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => openFilePicker({ type: index })}
                    disabled={isAnalyzing}
                    className={`pk-image-btn ${pkImages[index] ? 'active' : ''}`}
                    title="上传图片"
                  >
                    <Image size={16} />
                  </button>
                  {pkInputs.length > 2 && (
                    <button
                      type="button"
                      className="pk-remove-btn"
                      onClick={() => removePKInput(index)}
                      disabled={isAnalyzing}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {pkInputs.length < 5 && (
              <button
                type="button"
                className="pk-add-btn"
                onClick={addPKInput}
                disabled={isAnalyzing}
              >
                + 添加候选商品（最多 5 个）
              </button>
            )}
            {pkPreviews.some(Boolean) && (
              <div className="budget-thumbs">
                {pkPreviews.map(
                  (preview, index) =>
                    preview && (
                      <div key={index} className="budget-thumb">
                        <img src={preview} alt={`商品 ${index + 1}`} />
                        <button
                          type="button"
                          onClick={() => clearPKImage(index)}
                          className="clear-image-btn"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )
                )}
              </div>
            )}
          </div>
        )}

        {mode === 'budget' && (
          <div className="budget-inputs">
            <div className="budget-row">
              <label className="budget-label">预算</label>
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="例如：5000"
                disabled={isAnalyzing}
                className="budget-input"
                min={1}
              />
              <span className="budget-unit">元</span>
            </div>
            <div className="budget-row">
              <label className="budget-label">想买</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="例如：手机、笔记本、耳机（可选）"
                disabled={isAnalyzing}
                className="budget-category-input"
              />
              <div className="budget-image-actions">
                <ImageActionButtons target={{ type: 'budget' }} active={!!budgetImage} />
              </div>
            </div>
            {budgetPreview && (
              <div className="image-preview">
                <img src={budgetPreview} alt="预算图片预览" />
                <button type="button" onClick={clearBudgetImage} className="clear-image-btn">
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleFileChange}
          className="file-input"
        />

        {isAnalyzing ? (
          <button type="button" onClick={onStop} className="analyze-btn stop-btn">
            <Square size={16} fill="currentColor" />
            停止生成
          </button>
        ) : (
          <button type="submit" disabled={!canSubmit} className="analyze-btn">
            <Search size={18} />
            {mode === 'pk' ? '开始 PK' : mode === 'budget' ? '开始推荐' : '开始分析'}
          </button>
        )}
      </form>

      <div className="search-options">
        <div className="thinking-mode" title="快速模式响应快，深度模式更严谨，极限模式思考最充分">
          <span className="option-label">AI 模式</span>
          <button
            type="button"
            className={`mode-chip ${thinkingMode === 'fast' ? 'active' : ''}`}
            onClick={() => onThinkingModeChange?.('fast')}
            disabled={isAnalyzing}
          >
            <Zap size={12} />
            快速
          </button>
          <button
            type="button"
            className={`mode-chip ${thinkingMode === 'deep' ? 'active' : ''}`}
            onClick={() => onThinkingModeChange?.('deep')}
            disabled={isAnalyzing}
          >
            <Sparkles size={12} />
            深度
          </button>
          <button
            type="button"
            className={`mode-chip ${thinkingMode === 'max' ? 'active' : ''}`}
            onClick={() => onThinkingModeChange?.('max')}
            disabled={isAnalyzing}
          >
            <Brain size={12} />
            极限
          </button>
        </div>
      </div>

      <div className="preset-buttons">
        {mode === 'single' &&
          PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => handlePreset(preset)}
              disabled={isAnalyzing}
              className="preset-btn"
            >
              {preset}
            </button>
          ))}
        {mode === 'pk' &&
          PK_PRESETS.map((products, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handlePKPreset(products)}
              disabled={isAnalyzing}
              className="preset-btn pk-preset-btn"
            >
              {products.join(' vs ')}
            </button>
          ))}
        {mode === 'budget' &&
          BUDGET_PRESETS.map((preset, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleBudgetPreset(preset)}
              disabled={isAnalyzing}
              className="preset-btn budget-preset-btn"
            >
              {preset.budget}元买{preset.category}
            </button>
          ))}
      </div>
    </div>
  );
}
