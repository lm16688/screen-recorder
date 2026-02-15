import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/screen-recorder/',  // 注意：这里要改成你的仓库名
})
