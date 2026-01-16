import React, { useState, useRef, useEffect } from 'react';
import './ChatBotRAG.css';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface ChatBotRAGProps {
  apiUrl?: string;
}

const ChatBotRAG: React.FC<ChatBotRAGProps> = ({ apiUrl = 'http://localhost:8000' }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fileTypeFilter, setFileTypeFilter] = useState<string>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Mensaje de bienvenida
    setMessages([{
      id: '1',
      text: 'Hola! Soy tu asistente especializado en tráfico y seguridad vial. Puedo responder preguntas basándome en la información de la base de datos. ¿En qué puedo ayudarte?',
      sender: 'bot',
      timestamp: new Date()
    }]);
  }, []);

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const requestBody: any = {
        question: inputText
      };
      
      // Añadir filtro de tipo de archivo si no es 'all'
      if (fileTypeFilter !== 'all') {
        requestBody.file_type = fileTypeFilter;
      }
      
      const response = await fetch(`${apiUrl}/rag/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error('Error al obtener respuesta');
      }

      const data = await response.json();

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.answer,
        sender: 'bot',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Lo siento, ha ocurrido un error al procesar tu pregunta. Por favor, intenta de nuevo.',
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="chatbot-rag-container">
      <div className="chatbot-rag-messages">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`chatbot-rag-message ${message.sender === 'user' ? 'user-message' : 'bot-message'}`}
          >
            <div className="message-content">
              <div className="message-text">{message.text}</div>
              <div className="message-time">
                {message.timestamp.toLocaleTimeString('es-ES', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="chatbot-rag-message bot-message">
            <div className="message-content">
              <div className="message-text typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chatbot-rag-input-container">
        <select
          className="chatbot-rag-file-filter"
          value={fileTypeFilter}
          onChange={(e) => setFileTypeFilter(e.target.value)}
          disabled={isLoading}
        >
          <option value="all">📁 Todos los archivos</option>
          <option value="csv">📊 Solo CSV (Datasets)</option>
          <option value="pdf">📄 Solo PDF</option>
          <option value="json">🔧 Solo JSON</option>
          <option value="xml">📋 Solo XML</option>
        </select>
        
        <input
          type="text"
          className="chatbot-rag-input"
          placeholder="Escribe tu pregunta aquí..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isLoading}
        />
        <button
          className="chatbot-rag-send-button"
          onClick={handleSendMessage}
          disabled={isLoading || !inputText.trim()}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            width="24"
            height="24"
          >
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ChatBotRAG;
