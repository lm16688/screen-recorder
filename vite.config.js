import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/[你的仓库名]/', // 如果是用户页面，格式为 /[仓库名]/
  server: {
    port: 3000
  }
})
