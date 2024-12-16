<template>
  <div class="chat-container">
    <div class="chat-header">
      <h2><i class="fas fa-robot"></i> Chat with AI</h2>
    </div>

    <div class="chat-messages" ref="messageContainer">
      <div
        v-for="(message, index) in messages"
        :key="index"
        :class="[
          'message',
          message.role === 'user' ? 'user-message' : 'ai-message',
        ]"
      >
        <div class="message-header">
          <span>
            <i
              :class="message.role === 'user' ? 'fas fa-user' : 'fas fa-robot'"
            ></i>
            {{ message.role === "user" ? "You" : "AI" }}
          </span>
          <div class="message-actions" v-if="message.role === 'user'">
            <button
              class="action-btn"
              @click="editMessage(index)"
              :disabled="loading"
            >
              <i class="fas fa-edit"></i>
            </button>
          </div>
          <div class="message-actions" v-else>
            <button
              class="action-btn"
              @click="regenerateResponse(index)"
              :disabled="loading"
            >
              <i class="fas fa-sync-alt"></i>
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
              <button @click="saveEdit(index)" class="save-btn">
                <i class="fas fa-check"></i> 发送
              </button>
              <button @click="cancelEdit" class="cancel-btn">
                <i class="fas fa-times"></i> 取消
              </button>
            </div>
          </div>
          <!-- 普通显示模式 -->
          <template v-else>
            <div v-html="formatMessage(message.content)"></div>

            <!-- 图片内容 -->
            <div
              v-if="getMessageImages(message.content).length > 0"
              class="message-images"
            >
              <div
                v-for="(image, imgIndex) in getMessageImages(message.content)"
                :key="imgIndex"
                class="image-container"
              >
                <img :src="image" alt="Generated Image" />
                <div @click="showImagePreview(image)" class="image-overlay">
                  <i class="fas fa-search-plus"></i>
                </div>
              </div>
            </div>
          </template>
        </div>
        <div class="message-time">
          <i class="far fa-clock"></i> {{ message.timestamp }}
        </div>
      </div>

      <!-- 加载状态指示器 -->
      <div v-if="loading" class="typing-indicator">
        <i class="fas fa-circle-notch fa-spin"></i>
        AI正在思考<span>.</span><span>.</span><span>.</span>
      </div>
    </div>

    <div class="chat-input">
      <div class="input-container">
        <textarea
          v-model="userInput"
          @keyup.enter.exact="sendMessage"
          @keyup.enter.shift.exact="userInput += '\n'"
          @paste="handlePaste"
          :disabled="loading"
          placeholder="输入消息... (Shift + Enter 换行, Ctrl + V 粘贴图片)"
          rows="3"
        ></textarea>
        <div class="upload-preview" v-if="uploadedImages.length > 0">
          <div
            v-for="(image, index) in uploadedImages"
            :key="index"
            class="preview-thumbnail"
          >
            <img
              :src="image.thumbnail"
              @click="showImagePreview(image.original)"
              alt="Upload preview"
            />
            <button
              class="remove-image"
              @click.stop="removeUploadedImage(index)"
            >
              <i class="fas fa-times"></i>
            </button>
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
          />
          <i class="fas fa-image"></i>
        </label>
        <button
          class="send-btn"
          @click="sendMessage"
          :disabled="loading || (!userInput.trim() && !uploadedImages.length)"
        >
          <i class="fas fa-paper-plane"></i>
          {{ loading ? "发送中..." : "发送" }}
        </button>
      </div>
    </div>

    <!-- 图片预览模态框 -->
    <div
      v-if="previewImage"
      class="image-preview-modal"
      @click="closeImagePreview"
    >
      <div class="modal-content">
        <img :src="previewImage" alt="Preview" />
        <button class="close-button" @click="closeImagePreview">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import axios from "axios";

export default {
  name: "ChatInterface",
  data() {
    return {
      messages: [],
      userInput: "",
      loading: false,
      previewImage: null,
      editingIndex: -1,
      editingContent: "",
      uploadedImages: [],
    };
  },
  created() {
    // 从localStorage加载聊天记录
    const savedMessages = localStorage.getItem("chatMessages");
    if (savedMessages) {
      this.messages = JSON.parse(savedMessages);
    }
  },
  methods: {
    getMessageImages(content) {
      if (Array.isArray(content)) {
        return content
          .filter((item) => item.type === "image_url")
          .map((item) => item.image_url.url);
      } else if (content.images) {
        // 兼容旧格式
        return content.images;
      }
      return [];
    },
    formatMessage(content) {
      if (Array.isArray(content)) {
        return content
          .filter((item) => item.type === "text")
          .map((item) => item.text)
          .join("\n")
          .replace(
            /(https?:\/\/[^\s]+)/g,
            '<a href="$1" target="_blank">$1</a>'
          )
          .replace(/\n/g, "<br>");
      }
      return content
        .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>')
        .replace(/\n/g, "<br>");
    },
    clearChat() {
      if (confirm("确定要清除所有聊天记录吗？")) {
        this.messages = [];
        localStorage.removeItem("chatMessages");
      }
    },
    getCurrentTime() {
      return new Date().toLocaleTimeString();
    },
    showImagePreview(image) {
      console.log(image);
      this.previewImage = image;
    },
    closeImagePreview() {
      this.previewImage = null;
    },
    editMessage(index) {
      this.editingIndex = index;
      const messageContent = this.messages[index].content;

      // 从消息内容中提取文本
      if (Array.isArray(messageContent)) {
        const textContent = messageContent
          .filter((item) => item.type === "text")
          .map((item) => item.text)
          .join("\n");
        this.editingContent = textContent;
      } else {
        // 兼容旧格式
        this.editingContent = messageContent;
      }

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
      const newContent = [];

      // 添加编辑后的文本内容
      newContent.push({
        type: "text",
        text: this.editingContent.trim(),
      });

      // 保留原有的图片内容
      if (Array.isArray(originalMessage.content)) {
        const images = originalMessage.content.filter(
          (item) => item.type === "image_url"
        );
        newContent.push(...images);
      }

      this.messages[index] = {
        ...originalMessage,
        content: newContent,
      };

      // 删除从此消息之后的所有消息
      this.messages.splice(index + 1);

      // 重新发送编辑后的消息
      this.editingIndex = -1;
      this.loading = true;
      this.saveMessages();

      try {
        const response = await axios.post("http://localhost:3001/api/chat", {
          messages: [
            // {
            //   role: "system",
            //   content:
            //     "你是一个有帮助的助手,可以分析用户上传的图片并提供详细的回应。",
            // },
            ...this.messages.map((msg) => ({
              role: msg.role,
              content: Array.isArray(msg.content)
                ? msg.content
                : [
                    {
                      type: "text",
                      text: msg.content,
                    },
                  ],
            })),
          ],
        });

        if (response.data.choices && response.data.choices[0]) {
          const aiMessage = {
            role: "assistant",
            content: response.data.choices[0].message.content,
            timestamp: this.getCurrentTime(),
          };

          this.messages.push(aiMessage);
          this.saveMessages();
        }
      } catch (error) {
        console.error("Error:", error);
        this.messages.push({
          role: "assistant",
          content: "抱歉,我遇到了一个错误。请重试。",
          timestamp: this.getCurrentTime(),
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
      this.editingContent = "";
    },
    async regenerateResponse(index) {
      if (this.loading) return;

      // 删除当前回复及之后的所有消息
      this.messages.splice(index);
      this.loading = true;
      this.saveMessages();

      try {
        const response = await axios.post("http://localhost:3001/api/chat", {
          messages: [
            // {
            //   role: "system",
            //   content:
            //     "你是一个有帮助的助手,可以分析用户上传的图片并提供详细的回应。",
            // },
            ...this.messages.map((msg) => ({
              role: msg.role,
              content: Array.isArray(msg.content)
                ? msg.content
                : [
                    {
                      type: "text",
                      text: msg.content,
                    },
                  ],
            })),
          ],
        });

        if (response.data.choices && response.data.choices[0]) {
          const aiMessage = {
            role: "assistant",
            content: response.data.choices[0].message.content,
            timestamp: this.getCurrentTime(),
          };

          this.messages.push(aiMessage);
          this.saveMessages();
        }
      } catch (error) {
        console.error("Error:", error);
        this.messages.push({
          role: "assistant",
          content: "抱歉,我遇到了一个错误。请重试。",
          timestamp: this.getCurrentTime(),
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
      if (event && event.type === "keyup" && event.shiftKey) return;
      if (
        (!this.userInput.trim() && !this.uploadedImages.length) ||
        this.loading
      )
        return;

      // 构建新的消息格式
      const content = [];

      // 添加文本内容
      if (this.userInput.trim()) {
        content.push({
          type: "text",
          text: this.userInput.trim(),
        });
      }

      // 添加图片内容
      if (this.uploadedImages.length > 0) {
        this.uploadedImages.forEach((img) => {
          content.push({
            type: "image_url",
            image_url: {
              url: img.original,
            },
          });
        });
      }

      const userMessage = {
        role: "user",
        content: content,
        timestamp: this.getCurrentTime(),
      };

      this.messages.push(userMessage);
      this.userInput = "";
      this.uploadedImages = [];
      this.loading = true;
      this.saveMessages();

      try {
        const response = await axios.post("http://localhost:3001/api/chat", {
          messages: [
            // {
            //   role: "system",
            //   content:
            //     "你是一个有帮助的助手,可以分析用户上传的图片并提供详细的回应。",
            // },
            ...this.messages.map((msg) => ({
              role: msg.role,
              content: Array.isArray(msg.content)
                ? msg.content
                : [
                    {
                      type: "text",
                      text: msg.content,
                    },
                  ],
            })),
          ],
        });

        if (response.data.choices && response.data.choices[0]) {
          const aiMessage = {
            role: "assistant",
            content: response.data.choices[0].message.content,
            timestamp: this.getCurrentTime(),
          };

          this.messages.push(aiMessage);
          this.saveMessages();
        }
      } catch (error) {
        console.error("Error:", error);
        this.messages.push({
          role: "assistant",
          content: "抱歉,我遇到了一个错误。请重试。",
          timestamp: this.getCurrentTime(),
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
      localStorage.setItem("chatMessages", JSON.stringify(this.messages));
    },
    async handleImageUpload(event) {
      const files = event.target.files;
      if (!files.length) return;

      // 检查图片数量限制
      if (this.uploadedImages.length + files.length > 4) {
        alert("最多只能上传4张图片");
        event.target.value = "";
        return;
      }

      for (let file of files) {
        if (!file.type.startsWith("image/")) continue;

        // 检查文件大小
        if (file.size > 5 * 1024 * 1024) {
          // 5MB
          alert("图片大小不能超过5MB");
          continue;
        }

        try {
          // Create thumbnail and get base64 for original
          const [thumbnail, original] = await Promise.all([
            this.createThumbnail(file),
            this.createCompressedImage(file),
          ]);

          this.uploadedImages.push({
            thumbnail,
            original,
            file,
          });
        } catch (error) {
          console.error("Error processing image:", error);
        }
      }
      // Reset file input
      event.target.value = "";
    },

    async createThumbnail(file) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

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
            resolve(canvas.toDataURL("image/jpeg", 0.7));
          };
          img.src = e.target.result;
        };
        reader.readAsDataURL(file);
      });
    },

    async createCompressedImage(file) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            // 计算压缩后的尺寸（最大1920px）
            const maxSize = 1920;
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
            // 使用较低的质量压缩图片
            resolve(canvas.toDataURL("image/jpeg", 0.6));
          };
          img.src = e.target.result;
        };
        reader.readAsDataURL(file);
      });
    },

    removeUploadedImage(index) {
      this.uploadedImages.splice(index, 1);
    },

    // 添加处理粘贴事件的方法
    async handlePaste(event) {
      const items = (event.clipboardData || event.originalEvent.clipboardData)
        .items;

      for (let item of items) {
        if (item.type.indexOf("image") === 0) {
          event.preventDefault();

          // 检查图片数量限制
          if (this.uploadedImages.length >= 4) {
            alert("最多只能上传4张图片");
            return;
          }

          const file = item.getAsFile();
          if (file.size > 5 * 1024 * 1024) {
            // 5MB
            alert("图片大小不能超过5MB");
            return;
          }

          try {
            // 创建缩略图和压缩后的图片
            const [thumbnail, original] = await Promise.all([
              this.createThumbnail(file),
              this.createCompressedImage(file),
            ]);

            this.uploadedImages.push({
              thumbnail,
              original,
              file,
            });
          } catch (error) {
            console.error("Error processing pasted image:", error);
          }
        }
      }
    },
  },
};
</script>

<style scoped>
/* 导入 Font Awesome */
@import url("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css");

.chat-container {
  max-width: 1000px;
  margin: 20px auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-color);
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.chat-header {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  margin-bottom: 20px;
  padding: 0 15px;
  border-bottom: 2px solid var(--nav-bg);
  padding-bottom: 15px;
}

.chat-header h2 {
  margin: 0;
  color: var(--text-color);
  font-size: 1.2em;
  display: flex;
  align-items: center;
  gap: 10px;
}

.chat-header h2 i {
  color: #007bff;
}

.action-btn {
  cursor: pointer;
  background: #fff;
  width: 26px;
  height: 26px;
  border: 0;
  border-radius: 100%;
}
.action-btn .fa-edit {
  color: #ac94d6;
}
.message {
  margin: 20px 0;
  padding: 15px;
  border-radius: 16px;
  max-width: 85%;
  position: relative;
  transition: all 0.3s ease;
  animation: messageSlide 0.3s ease;
}

@keyframes messageSlide {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9em;
  margin-bottom: 8px;
  opacity: 0.8;
}

.message-header span {
  display: flex;
  align-items: center;
  gap: 6px;
}

.message-time {
  font-size: 0.75em;
  opacity: 0.7;
  margin-top: 8px;
  text-align: right;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
}

.user-message {
  background-color: #ac94d6;
  color: white;
  margin-left: auto;
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.2);
}

.ai-message {
  background-color: var(--nav-bg);
  color: var(--text-color);
  margin-right: auto;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.chat-input {
  display: flex;
  flex-direction: column;
  gap: 15px;
  background-color: var(--nav-bg);
  padding: 20px;
  border-radius: 12px;
  border: 1px solid var(--nav-bg);
  margin-top: 20px;
}

.input-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
}

textarea {
  width: 100%;
  padding: 15px;
  border: 1px solid rgba(0, 123, 255, 0.2);
  border-radius: 12px;
  font-size: 16px;
  resize: none;
  line-height: 1.5;
  font-family: inherit;
  background-color: var(--bg-color);
  color: var(--text-color);
  transition: all 0.3s ease;
  min-height: 60px;
}

textarea:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.action-buttons {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: flex-end;
}

.upload-btn {
  width: 45px;
  height: 45px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-color);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid rgba(0, 123, 255, 0.2);
}

.upload-btn input[type="file"] {
  display: none;
}

.upload-btn i {
  font-size: 20px;
  color: #007bff;
}

.upload-btn:hover:not(.disabled) {
  background-color: rgba(0, 123, 255, 0.1);
  transform: translateY(-1px);
}

.upload-btn.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.upload-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px;
  background-color: var(--bg-color);
  border-radius: 8px;
  border: 1px solid rgba(0, 123, 255, 0.2);
}

.preview-thumbnail {
  position: relative;
  width: 60px;
  height: 60px;
  border-radius: 8px;
  overflow: hidden;
  background-color: var(--bg-color);
}

.preview-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.preview-thumbnail:hover img {
  transform: scale(1.05);
}

.remove-image {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: rgba(0, 0, 0, 0.6);
  border: none;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.3s ease;
}

.remove-image:hover {
  background-color: rgba(220, 53, 69, 0.8);
  transform: scale(1.1);
}

.send-btn {
  padding: 12px 24px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
  height: 45px;
}

.send-btn:hover:not(:disabled) {
  background-color: #0056b3;
  transform: translateY(-1px);
}

.send-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
  opacity: 0.6;
}

.typing-indicator {
  padding: 12px 20px;
  background-color: var(--nav-bg);
  color: var(--text-color);
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: 10px;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.typing-indicator i {
  color: #007bff;
}

.image-container {
  position: relative;
  overflow: hidden;
  border-radius: 8px;
  cursor: pointer;
}

.image-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.image-container:hover .image-overlay {
  opacity: 1;
}

.image-overlay i {
  color: white;
  font-size: 24px;
}

.image-preview-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
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
  border-radius: 8px;
}

.close-button {
  position: absolute;
  top: -40px;
  right: 0;
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  padding: 8px;
  transition: transform 0.3s ease;
}

.close-button:hover {
  transform: scale(1.1);
}

.message-images {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.image-container {
  position: relative;
  width: 100px;
  height: 100px;
  overflow: hidden;
  border-radius: 8px;
  cursor: pointer;
}

.image-container img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.image-container:hover img {
  transform: scale(1.05);
}

.image-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.image-container:hover .image-overlay {
  opacity: 1;
}

.image-overlay i {
  color: white;
  font-size: 20px;
}

.edit-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 10px;
}

.save-btn,
.cancel-btn {
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.3s ease;
  border: none;
  color: white;
  height: 36px;
}

.save-btn {
  background-color: #28a745;
  border: 1px solid rgba(40, 167, 69, 0.2);
}

.save-btn:hover {
  background-color: #218838;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(40, 167, 69, 0.2);
}

.cancel-btn {
  background-color: #6c757d;
  border: 1px solid rgba(108, 117, 125, 0.2);
}

.cancel-btn:hover {
  background-color: #5a6268;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(108, 117, 125, 0.2);
}

.edit-mode {
  width: 100%;
}

.edit-mode textarea {
  width: 100%;
  margin-bottom: 10px;
  background-color: var(--bg-color);
  color: var(--text-color);
  border: 1px solid rgba(0, 123, 255, 0.2);
  border-radius: 8px;
  padding: 12px;
  font-size: 14px;
  resize: vertical;
  min-height: 80px;
  transition: all 0.3s ease;
}

.edit-mode textarea:focus {
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

/* 其他现有样式保持不变 */
</style>
