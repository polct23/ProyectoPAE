import React, { useState } from 'react';
import ChatBotRAG from '../components/ChatBotRAG';
import { useAuth } from '../AuthContext';
import './ChatBot.css';

const ChatBot: React.FC = () => {
  const auth = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const apiUrl = 'http://localhost:8000';

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const allowedTypes = ['application/pdf', 'text/xml', 'application/xml', 'application/json', 'text/csv'];
      const allowedExtensions = ['.pdf', '.xml', '.json', '.csv'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      
      if (allowedTypes.includes(file.type) || allowedExtensions.includes(fileExtension)) {
        setSelectedFile(file);
        setUploadMessage('');
      } else {
        setUploadMessage('Por favor, selecciona un archivo PDF, XML, JSON o CSV válido.');
        setSelectedFile(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    // Verificar que el usuario está autenticado
    if (!auth.accessToken) {
      setUploadMessage('✗ Error: Debes iniciar sesión primero');
      return;
    }

    setIsUploading(true);
    setUploadMessage('');

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch(`${apiUrl}/rag/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${auth.accessToken}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al subir el archivo');
      }

      const data = await response.json();
      setUploadMessage(`✓ ${data.message}`);
      setSelectedFile(null);
      
      // Resetear el input de archivo
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
    } catch (error) {
      setUploadMessage(`✗ Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="chatbot-page">
      <div className="chatbot-header">
        <h1>Asistente Virtual PAE RACC</h1>
        <p>Consulta información sobre tráfico y seguridad vial</p>
      </div>

      <div className="chatbot-content">
        <div className="chatbot-sidebar">
          <div className="upload-section">
            <h3>📄 Cargar Documentos</h3>
            <p className="upload-description">
              Sube archivos (PDF, XML, JSON, CSV) para que el asistente pueda responder preguntas basadas en su contenido.
            </p>
            
            <div className="upload-controls">
              <label htmlFor="file-upload" className="file-label">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                {selectedFile ? selectedFile.name : 'Seleccionar archivo'}
              </label>
              <input
                id="file-upload"
                type="file"
                accept=".pdf,.xml,.json,.csv"
                onChange={handleFileSelect}
                disabled={isUploading}
                style={{ display: 'none' }}
              />
              
              {selectedFile && (
                <button
                  className="upload-button"
                  onClick={handleUpload}
                  disabled={isUploading}
                >
                  {isUploading ? 'Subiendo...' : 'Subir archivo'}
                </button>
              )}
            </div>

            {uploadMessage && (
              <div className={`upload-message ${uploadMessage.startsWith('✓') ? 'success' : 'error'}`}>
                {uploadMessage}
              </div>
            )}
          </div>

          <div className="info-section">
            <h3>ℹ️ Información</h3>
            <ul>
              <li>El asistente solo responde basándose en los documentos cargados</li>
              <li>Puedes hacer preguntas en español, catalán, inglés, etc.</li>
              <li>Las respuestas incluyen referencias a las fuentes</li>
              <li>Requiere autenticación para cargar documentos</li>
            </ul>
          </div>
        </div>

        <div className="chatbot-main">
          <ChatBotRAG apiUrl={apiUrl} />
        </div>
      </div>
    </div>
  );
};

export default ChatBot;
