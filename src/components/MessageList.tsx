import { useEffect, useRef } from 'react';
import { User, Bot } from 'lucide-react';
import './MessageList.css';
import type { ChatMessage, MessageContent } from '../types';

interface MessageListProps {
  messages: ChatMessage[];
}

function renderContent(content: string | MessageContent[]) {
  if (typeof content === 'string') {
    return <div className="message-bubble">{content}</div>;
  }

  const textParts = content
    .filter((c): c is MessageContent & { type: 'text' } => c.type === 'text')
    .map((c) => c.text)
    .filter(Boolean)
    .join('\n');

  const imageParts = content.filter(
    (c): c is MessageContent & { type: 'image_url' } => c.type === 'image_url' && !!c.image_url?.url
  );

  return (
    <>
      {imageParts.length > 0 && (
        <div className="message-images">
          {imageParts.map((c, index) => (
            <img
              key={index}
              src={c.image_url!.url}
              alt="上传图片"
              className="message-image"
            />
          ))}
        </div>
      )}
      {textParts && <div className="message-bubble">{textParts}</div>}
    </>
  );
}

export function MessageList({ messages }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) return null;

  return (
    <div className="message-list">
      {messages.map((msg, index) => (
        <div
          key={msg.id}
          className={`message-item ${msg.role}`}
          style={{ animationDelay: `${index * 0.05}s` }}
        >
          <div className="message-avatar">
            {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
          </div>
          <div className="message-content">
            {msg.imageUrl && typeof msg.content === 'string' && (
              <img src={msg.imageUrl} alt="上传图片" className="message-image" />
            )}
            {renderContent(msg.content)}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
