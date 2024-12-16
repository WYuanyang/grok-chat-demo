const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());

// 增加请求体大小限制
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const PORT = process.env.PORT || 3001; // 修改默认端口为3001
const XAI_API_KEY = process.env.XAI_API_KEY;

// 添加全局错误处理中间件
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 413) {
    res.status(413).json({
      error: '请求数据过大',
      message: '请减小图片大小或数量后重试'
    });
  } else {
    next();
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    // 设置较长的超时时间
    const response = await axios.post('https://api.x.ai/v1/chat/completions', {
      messages: req.body.messages,
      model: "grok-2-vision-1212",
      stream: false,
      temperature: 0
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${XAI_API_KEY}`
      },
      timeout: 30000 // 30秒超时
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    
    // 优化错误处理
    if (error.code === 'ECONNABORTED') {
      res.status(504).json({
        error: '请求超时',
        message: '服务器响应时间过长，请稍后重试'
      });
    } else if (error.response?.status === 413) {
      res.status(413).json({
        error: '请求数据过大',
        message: '请减小图片大小或数量后重试'
      });
    } else {
      res.status(error.response?.status || 500).json({
        error: '与AI服务通信失败',
        message: error.response?.data?.error || error.message
      });
    }
  }
});

// 添加健康检查端点
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 