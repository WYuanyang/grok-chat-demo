# AI 图文对话助手

这是一个基于 Vue.js 和 Express 的 AI 图文对话应用，支持与 AI 进行文字交流和图片分析。

## 功能特性

- 💬 实时文字对话
- 📸 图片上传和分析
  - 支持多图片上传（最多4张）
  - 支持截图粘贴上传
  - 自动生成图片缩略图
  - 图片压缩和大小限制
- 🖼️ 图片预览
  - 缩略图预览
  - 点击查看原图
  - 模态框展示
- ✏️ 消息编辑
  - 支持编辑已发送的消息
  - 保留图片内容
- 🔄 重新生成回复
- 💾 本地历史记录
- 📱 响应式设计

## 技术栈

- 前端：Vue.js
- 后端：Express
- API：x.ai API (grok-vision-beta 模型)
- 其他：axios, cors

## 环境要求

- Node.js >= 14.x
- NPM >= 6.x
- 现代浏览器（支持 ES6+）

## 安装步骤

1. 克隆项目
```bash
git clone [项目地址]
```

2. 安装依赖
```bash
# 安装前端依赖
cd frontend
npm install

# 安装后端依赖
cd ../server
npm install
```

3. 配置环境变量
```bash
# 在 server 目录下创建 .env 文件
cd server
echo "XAI_API_KEY=your_api_key" > .env
```

## 运行说明

1. 启动后端服务器
```bash
cd server
npm start
```

2. 启动前端开发服务器
```bash
cd frontend
npm run serve
```

3. 访问应用
打开浏览器访问 `http://localhost:8080`

## 使用说明

### 基本对话
- 在输入框中输入文字消息
- 点击发送按钮或按 Enter 键发送
- 使用 Shift + Enter 换行

### 图片上传
- 点击📎按钮选择图片文件上传
- 直接粘贴截图（Ctrl+V）
- 支持同时发送多张图片（最多4张）
- 单张图片大小限制为5MB

### 消息编辑
- 点击消息右上角的✎图标进入编辑模式
- 编辑完成后点击保存或按 Enter 键
- 点击取消或按 ESC 键取消编辑

### 重新生成回复
- 点击 AI 回复右上角的↻图标重新生成回复

### 图片预览
- 点击缩略图查看原图
- 点击预览窗口空白处或关闭按钮关闭预览

### 清除对话
- 点击右上角的 "Clear Chat" 按钮清除所有对话记录

## 注意事项

1. 图片处理
   - 上传的图片会自动压缩
   - 图片最大尺寸限制为1920px
   - 支持的图片格式：PNG, JPG, JPEG, GIF

2. 数据存储
   - 对话历史保存在浏览器本地存储中
   - 清除浏览器数据会导致历史记录丢失

3. 网络要求
   - 需要稳定的网络连接
   - 图片上传可能需要较长时间

## 开发说明

### 目录结构
```
├── frontend/                # 前端项目目录
│   ├── src/
│   │   ├── components/     # Vue 组件
│   │   └── ...
│   └── ...
├── server/                 # 后端项目目录
│   ├── server.js          # Express 服务器
│   └── ...
└── README.md
```

### API 接口

#### POST /api/chat
发送对话消息

请求体格式：
```json
{
  "messages": [
    {
      "role": "system",
      "content": "系统提示"
    },
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "文本内容"
        },
        {
          "type": "image_url",
          "image_url": {
            "url": "图片base64数据"
          }
        }
      ]
    }
  ]
}
```


## 许可证

[MIT License](LICENSE) 