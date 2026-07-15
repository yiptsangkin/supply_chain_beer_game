// 后端服务器地址
// 开发环境：Vite proxy 会将 / 转发到 localhost:3000，使用空字符串
// 生产环境：设置为部署的后端 URL，如 https://beer-game-api.railway.app
export const SERVER_URL = import.meta.env.VITE_SERVER_URL || '';