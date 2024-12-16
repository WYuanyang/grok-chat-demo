<template>
  <div class="chat-container">
    <div class="chat-header">
      <h2>Chat with AI</h2>
      <button class="clear-btn" @click="clearChat" :disabled="loading">
        Clear Chat
      </button>
    </div>

    <div class="chat-messages" ref="messageContainer">
      <div v-for="(message, index) in messages" :key="index" 
           :class="['message', message.role === 'user' ? 'user-message' : 'ai-message']">
        <div class="message-header">
          <span>{{ message.role === 'user' ? 'You' : 'AI' }}</span>
          <div class="message-actions" v-if="message.role === 'user'">
            <button class="action-btn" @click="editMessage(index)" :disabled="loading">
              <span class="icon">✎</span>
            </button>
          </div>
          <div class="message-actions" v-else>
            <button class="action-btn" @click="regenerateResponse(index)" :disabled="loading">
              <span class="icon">↻</span>
            </button>
          </div>
        </div>
        <div class="message-content">
          <!-- 编辑模式 -->
          <div v-if="editingIndex === index" class="edit-mode">
            <textarea 
              v-model="editingContent"
              @keyup.enter="saveEdit(index)"
              @keyup.esc="cancelEdit"
              rows="3"
              ref="editTextarea"
            ></textarea>
            <div class="edit-actions">
              <button @click="saveEdit(index)" class="save-btn">Save</button>
              <button @click="cancelEdit" class="cancel-btn">Cancel</button>
            </div>
          </div>
          <!-- 普通显示模式 -->
          <template v-else>
            <div v-html="formatMessage(message.content)"></div>
            
            <!-- 图片内容 -->
            <div v-if="getMessageImages(message.content).length > 0" class="message-images">
              <div v-for="(image, imgIndex) in getMessageImages(message.content)" :key="imgIndex" class="image-container">
                <img :src="image" @click="showImagePreview(image)" alt="Generated Image" />
              </div>
            </div>
          </template>
        </div>
        <div class="message-time">{{ message.timestamp }}</div>
      </div>
      
      <!-- 加载状态指示器 -->
      <div v-if="loading" class="typing-indicator">
        AI正在思考<span>.</span><span>.</span><span>.</span>
      </div>
    </div>
    
    <div class="chat-input">
      <div class="input-container">
        <textarea 
          v-model="userInput" 
          @keyup.enter.exact="sendMessage"
          @keyup.enter.shift.exact="userInput += '\n'"
          :disabled="loading"
          placeholder="Type your message here... (Shift + Enter for new line)"
          rows="3"
        ></textarea>
        <div class="upload-preview" v-if="uploadedImages.length > 0">
          <div v-for="(image, index) in uploadedImages" :key="index" class="preview-thumbnail">
            <img :src="image.thumbnail" @click="showImagePreview(image.original)" alt="Upload preview" />
            <button class="remove-image" @click.stop="removeUploadedImage(index)">&times;</button>
          </div>
        </div>
      </div>
      <div class="action-buttons">
        <label class="upload-btn" :class="{ disabled: loading }">
          <input 
            type="file" 
            accept="image/*" 
            multiple 
            @change="handleImageUpload" 
            :disabled="loading"
          >
          <span class="icon">📎</span>
        </label>
        <button @click="sendMessage" :disabled="loading || (!userInput.trim() && !uploadedImages.length)">
          {{ loading ? 'Sending...' : 'Send' }}
        </button>
      </div>
    </div>

    <!-- 图片预览模态框 -->
    <div v-if="previewImage" class="image-preview-modal" @click="closeImagePreview">
      <div class="modal-content">
        <img :src="previewImage" alt="Preview" />
        <button class="close-button" @click="closeImagePreview">&times;</button>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'ChatInterface',
  data() {
    return {
      messages: [],
      userInput: '',
      loading: false,
      previewImage: null,
      editingIndex: -1,
      editingContent: '',
      uploadedImages: [],
    }
  },
  created() {
    // 从localStorage加载聊天记录
    const savedMessages = localStorage.getItem('chatMessages');
    if (savedMessages) {
      this.messages = JSON.parse(savedMessages);
    }
  },
  methods: {
    getMessageImages(content) {
      if (Array.isArray(content)) {
        return content
          .filter(item => item.type === "image_url")
          .map(item => item.image_url.url);
      } else if (content.images) {
        // 兼容旧格式
        return content.images;
      }
      return [];
    },
    formatMessage(content) {
      if (Array.isArray(content)) {
        return content
          .filter(item => item.type === "text")
          .map(item => item.text)
          .join('\n')
          .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>')
          .replace(/\n/g, '<br>');
      }
      return content.replace(
        /(https?:\/\/[^\s]+)/g,
        '<a href="$1" target="_blank">$1</a>'
      ).replace(/\n/g, '<br>');
    },
    clearChat() {
      if (confirm('Are you sure you want to clear all chat messages?')) {
        this.messages = [];
        localStorage.removeItem('chatMessages');
      }
    },
    getCurrentTime() {
      return new Date().toLocaleTimeString();
    },
    showImagePreview(image) {
      this.previewImage = image;
    },
    closeImagePreview() {
      this.previewImage = null;
    },
    editMessage(index) {
      this.editingIndex = index;
      this.editingContent = this.messages[index].content;
      // 使用 nextTick 确保 DOM 已更新
      this.$nextTick(() => {
        // 检查元素是否存在且是否为数组
        if (this.$refs.editTextarea) {
          const textarea = Array.isArray(this.$refs.editTextarea) 
            ? this.$refs.editTextarea[0] 
            : this.$refs.editTextarea;
          if (textarea && textarea.focus) {
            textarea.focus();
          }
        }
      });
    },
    async saveEdit(index) {
      if (!this.editingContent.trim()) return;
      
      const originalMessage = this.messages[index];
      this.messages[index] = {
        ...originalMessage,
        content: [{
          type: "text",
          text: this.editingContent.trim()
        }]
      };
      
      // 删除从此消息之后的所有消息
      this.messages.splice(index + 1);
      
      // 重新发送编辑后的消息
      this.editingIndex = -1;
      this.loading = true;
      this.saveMessages();

      try {
        const response = await axios.post('http://localhost:3001/api/chat', {
          messages: [
            {
              role: 'system',
              content: '你是一个有帮助的助手,可以分析用户上传的图片并提供详细的回应。'
            },
            ...this.messages.map(msg => ({
              role: msg.role,
              content: Array.isArray(msg.content) ? msg.content : [{
                type: "text",
                text: msg.content
              }]
            }))
          ]
        });

        if (response.data.choices && response.data.choices[0]) {
          const aiMessage = {
            role: 'assistant',
            content: response.data.choices[0].message.content,
            timestamp: this.getCurrentTime()
          };
          
          this.messages.push(aiMessage);
          this.saveMessages();
        }
      } catch (error) {
        console.error('Error:', error);
        this.messages.push({
          role: 'assistant',
          content: '抱歉,我遇到了一个错误。请重试。',
          timestamp: this.getCurrentTime()
        });
        this.saveMessages();
      } finally {
        this.loading = false;
        this.$nextTick(() => {
          this.scrollToBottom();
        });
      }
    },
    cancelEdit() {
      this.editingIndex = -1;
      this.editingContent = '';
    },
    async regenerateResponse(index) {
      if (this.loading) return;
      
      // 删除当前回复及之后的所有消息
      this.messages.splice(index);
      this.loading = true;
      this.saveMessages();

      try {
        const response = await axios.post('http://localhost:3001/api/chat', {
          messages: [
            {
              role: 'system',
              content: '你是一个有帮助的助手,可以分析用户上传的图片并提供详细的回应。'
            },
            ...this.messages.map(msg => ({
              role: msg.role,
              content: Array.isArray(msg.content) ? msg.content : [{
                type: "text",
                text: msg.content
              }]
            }))
          ]
        });

        if (response.data.choices && response.data.choices[0]) {
          const aiMessage = {
            role: 'assistant',
            content: response.data.choices[0].message.content,
            timestamp: this.getCurrentTime()
          };
          
          this.messages.push(aiMessage);
          this.saveMessages();
        }
      } catch (error) {
        console.error('Error:', error);
        this.messages.push({
          role: 'assistant',
          content: '抱歉,我遇到了一个错误。请重试。',
          timestamp: this.getCurrentTime()
        });
        this.saveMessages();
      } finally {
        this.loading = false;
        this.$nextTick(() => {
          this.scrollToBottom();
        });
      }
    },
    async sendMessage(event) {
      if (event && event.type === 'keyup' && event.shiftKey) return;
      if ((!this.userInput.trim() && !this.uploadedImages.length) || this.loading) return;
      
      // 构建新的消息格式
      const content = [];
      
      // 添加文本内容
      if (this.userInput.trim()) {
        content.push({
          type: "text",
          text: this.userInput.trim()
        });
      }
      
      // 添加图片内容
      if (this.uploadedImages.length > 0) {
        this.uploadedImages.forEach(img => {
          content.push({
            type: "image_url",
            image_url: {
              url: img.original
            }
          });
        });
      }

      const userMessage = {
        role: 'user',
        content: content,
        timestamp: this.getCurrentTime()
      };
      
      this.messages.push(userMessage);
      this.userInput = '';
      this.uploadedImages = [];
      this.loading = true;
      this.saveMessages();

      try {
        const response = await axios.post('http://localhost:3001/api/chat', {
          messages: [
            {
              role: 'system',
              content: '你是一个有帮助的助手,可以分析用户上传的图片并提供详细的回应。'
            },
            ...this.messages.map(msg => ({
              role: msg.role,
              content: Array.isArray(msg.content) ? msg.content : [{
                type: "text",
                text: msg.content
              }]
            }))
          ]
        });

        if (response.data.choices && response.data.choices[0]) {
          const aiMessage = {
            role: 'assistant',
            content: response.data.choices[0].message.content,
            timestamp: this.getCurrentTime()
          };
          
          this.messages.push(aiMessage);
          this.saveMessages();
        }
      } catch (error) {
        console.error('Error:', error);
        this.messages.push({
          role: 'assistant',
          content: '抱歉,我遇到了一个错误。请重试。',
          timestamp: this.getCurrentTime()
        });
        this.saveMessages();
      } finally {
        this.loading = false;
        this.$nextTick(() => {
          this.scrollToBottom();
        });
      }
    },
    scrollToBottom() {
      const container = this.$refs.messageContainer;
      container.scrollTop = container.scrollHeight;
    },
    saveMessages() {
      localStorage.setItem('chatMessages', JSON.stringify(this.messages));
    },
    async handleImageUpload(event) {
      const files = event.target.files;
      if (!files.length) return;

      for (let file of files) {
        if (!file.type.startsWith('image/')) continue;

        try {
          // Create thumbnail and get base64 for original
          const [thumbnail, original] = await Promise.all([
            this.createThumbnail(file),
            this.fileToBase64(file)
          ]);

          this.uploadedImages.push({
            thumbnail,
            original,
            file
          });
        } catch (error) {
          console.error('Error processing image:', error);
        }
      }
      // Reset file input
      event.target.value = '';
    },

    async createThumbnail(file) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Calculate thumbnail dimensions (max 100px)
            const maxSize = 100;
            let width = img.width;
            let height = img.height;
            
            if (width > height) {
              if (width > maxSize) {
                height = height * (maxSize / width);
                width = maxSize;
              }
            } else {
              if (height > maxSize) {
                width = width * (maxSize / height);
                height = maxSize;
              }
            }
            
            canvas.width = width;
            canvas.height = height;
            
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.7));
          };
          img.src = e.target.result;
        };
        reader.readAsDataURL(file);
      });
    },

    fileToBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
      });
    },

    removeUploadedImage(index) {
      this.uploadedImages.splice(index, 1);
    },
  }
}
</script>

<style scoped>
.chat-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
  height: 85vh;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-color);
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 0 10px;
}

.chat-header h2 {
  margin: 0;
  color: var(--text-color);
}

.clear-btn {
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.clear-btn:disabled {
  background-color: #dc354580;
}

.chat-messages {
  flex-grow: 1;
  overflow-y: auto;
  padding: 20px;
  margin-bottom: 20px;
  background-color: var(--bg-color);
  border: 1px solid var(--nav-bg);
  border-radius: 8px;
}

.message {
  margin: 15px 0;
  padding: 12px;
  border-radius: 12px;
  max-width: 85%;
  position: relative;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8em;
  margin-bottom: 5px;
  opacity: 0.7;
}

.message-time {
  font-size: 0.7em;
  opacity: 0.6;
  margin-top: 5px;
  text-align: right;
}

.user-message {
  background-color: #007bff;
  color: white;
  margin-left: auto;
}

.user-message .message-header {
  color: rgba(255, 255, 255, 0.8);
}

.ai-message {
  background-color: var(--nav-bg);
  color: var(--text-color);
  margin-right: auto;
}

.ai-message a {
  color: #007bff;
  text-decoration: none;
}

.ai-message a:hover {
  text-decoration: underline;
}

.chat-input {
  display: flex;
  gap: 15px;
  background-color: var(--nav-bg);
  padding: 15px;
  border-radius: 8px;
  border: 1px solid var(--nav-bg);
}

textarea {
  flex-grow: 1;
  padding: 12px;
  border: 1px solid var(--nav-bg);
  border-radius: 6px;
  font-size: 16px;
  resize: none;
  line-height: 1.5;
  font-family: inherit;
  background-color: var(--bg-color);
  color: var(--text-color);
}

textarea:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0,123,255,0.25);
}

button {
  padding: 12px 24px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.2s;
}

button:hover:not(:disabled) {
  background-color: #0056b3;
}

button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.typing-indicator {
  padding: 10px;
  background-color: var(--nav-bg);
  color: var(--text-color);
  border-radius: 8px;
  display: inline-block;
  margin-left: 10px;
}

.typing-indicator span {
  animation: typing 1s infinite;
  margin-left: 2px;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}

::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: var(--nav-bg);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #555;
}

@media (max-width: 768px) {
  .chat-container {
    height: 90vh;
    padding: 10px;
  }

  .message {
    max-width: 90%;
  }

  textarea {
    font-size: 14px;
  }

  button {
    padding: 10px 20px;
    font-size: 14px;
  }
}

/* 新增图片相关样式 */
.message-images {
  margin-top: 10px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
}

.image-container {
  position: relative;
  width: 100%;
  padding-bottom: 100%; /* 1:1 宽高比 */
  overflow: hidden;
  border-radius: 8px;
  cursor: pointer;
}

.image-container img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.image-container:hover img {
  transform: scale(1.05);
}

.image-preview-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.9);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  position: relative;
  max-width: 90%;
  max-height: 90%;
}

.modal-content img {
  max-width: 100%;
  max-height: 90vh;
  object-fit: contain;
}

.close-button {
  position: absolute;
  top: -40px;
  right: 0;
  background: none;
  border: none;
  color: white;
  font-size: 30px;
  cursor: pointer;
}

.generating-image {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background-color: var(--nav-bg);
  border-radius: 8px;
}

.generating-spinner {
  width: 20px;
  height: 20px;
  border: 3px solid var(--text-color);
  border-top: 3px solid transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.dots span {
  animation: typing 1s infinite;
  margin-left: 2px;
}

.dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 响应式设计调整 */
@media (max-width: 768px) {
  .message-images {
    grid-template-columns: 1fr;
  }

  .modal-content img {
    max-width: 95vw;
    max-height: 80vh;
  }
}

/* 新增编辑和重新生成相关样式 */
.message-actions {
  display: flex;
  gap: 5px;
}

.action-btn {
  background: none;
  border: none;
  color: inherit;
  padding: 2px 5px;
  cursor: pointer;
  opacity: 0.7;
  font-size: 1em;
  transition: opacity 0.2s;
}

.action-btn:hover {
  opacity: 1;
}

.action-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.icon {
  font-size: 1.2em;
}

.edit-mode {
  width: 100%;
}

.edit-mode textarea {
  width: 100%;
  margin-bottom: 10px;
  background-color: var(--bg-color);
  color: var(--text-color);
  border: 1px solid var(--nav-bg);
  border-radius: 4px;
  padding: 8px;
  font-size: 14px;
  resize: vertical;
}

.edit-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.save-btn, .cancel-btn {
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.save-btn {
  background-color: #28a745;
  color: white;
  border: none;
}

.cancel-btn {
  background-color: #6c757d;
  color: white;
  border: none;
}

.save-btn:hover {
  background-color: #218838;
}

.cancel-btn:hover {
  background-color: #5a6268;
}

/* 响应式设计调整 */
@media (max-width: 768px) {
  .message-actions {
    gap: 3px;
  }

  .action-btn {
    padding: 1px 3px;
  }

  .edit-mode textarea {
    font-size: 12px;
  }

  .save-btn, .cancel-btn {
    padding: 4px 8px;
    font-size: 12px;
  }
}

/* Add new styles for image upload */
.input-container {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.action-buttons {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.upload-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background-color: var(--nav-bg);
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.upload-btn:hover:not(.disabled) {
  background-color: var(--nav-hover);
}

.upload-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.upload-btn input[type="file"] {
  display: none;
}

.upload-btn .icon {
  font-size: 20px;
}

.upload-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px;
  background-color: var(--nav-bg);
  border-radius: 6px;
}

.preview-thumbnail {
  position: relative;
  width: 60px;
  height: 60px;
  border-radius: 4px;
  overflow: hidden;
}

.preview-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  cursor: pointer;
}

.remove-image {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 20px;
  height: 20px;
  padding: 0;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  border: none;
  border-radius: 50%;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove-image:hover {
  background-color: rgba(0, 0, 0, 0.7);
}

/* Adjust existing styles */
.chat-input {
  gap: 15px;
}

@media (max-width: 768px) {
  .preview-thumbnail {
    width: 50px;
    height: 50px;
  }

  .upload-btn {
    width: 36px;
    height: 36px;
  }

  .upload-btn .icon {
    font-size: 18px;
  }
}
</style> 