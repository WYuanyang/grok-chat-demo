<template>
  <div id="app">
    <nav class="navbar">
      <div class="nav-content">
        <h1>AI Chat Assistant</h1>
        <div class="theme-toggle">
          <button @click="toggleTheme">
            {{ isDarkTheme ? '☀️ Light' : '🌙 Dark' }}
          </button>
        </div>
      </div>
    </nav>
    <main :class="{ 'dark-theme': isDarkTheme }">
      <ChatInterface />
    </main>
  </div>
</template>

<script>
import ChatInterface from './components/ChatInterface.vue'

export default {
  name: 'App',
  components: {
    ChatInterface
  },
  data() {
    return {
      isDarkTheme: false
    }
  },
  created() {
    // 从localStorage加载主题设置
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      this.isDarkTheme = savedTheme === 'dark';
    } else {
      // 检查系统主题偏好
      this.isDarkTheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
  },
  methods: {
    toggleTheme() {
      this.isDarkTheme = !this.isDarkTheme;
      localStorage.setItem('theme', this.isDarkTheme ? 'dark' : 'light');
    }
  }
}
</script>

<style>
:root {
  --bg-color: #ffffff;
  --text-color: #2c3e50;
  --nav-bg: #f8f9fa;
  --nav-text: #2c3e50;
}

.dark-theme {
  --bg-color: #1a1a1a;
  --text-color: #ffffff;
  --nav-bg: #2c3e50;
  --nav-text: #ffffff;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  min-height: 100vh;
  background-color: var(--bg-color);
  color: var(--text-color);
  transition: background-color 0.3s, color 0.3s;
}

.navbar {
  background-color: var(--nav-bg);
  padding: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  position: fixed;
  top: 0;
  width: 100%;
  z-index: 1000;
  transition: background-color 0.3s;
}

.nav-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.navbar h1 {
  margin: 0;
  font-size: 1.5rem;
  color: var(--nav-text);
}

.theme-toggle button {
  background: none;
  border: 1px solid currentColor;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  color: var(--nav-text);
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.theme-toggle button:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

main {
  padding: 80px 20px 20px;
  min-height: 100vh;
  background-color: var(--bg-color);
  transition: background-color 0.3s;
}

@media (max-width: 768px) {
  .navbar {
    padding: 0.8rem;
  }

  .navbar h1 {
    font-size: 1.2rem;
  }

  main {
    padding: 70px 10px 10px;
  }
}
</style>
