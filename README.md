# 上海电满家工商业项目管理平台

光伏工商业项目投资评估系统，支持多股东在线评估、留痕、汇总导出。

## 功能特点

- 项目管理：创建、编辑、删除光伏项目
- 股东管理：添加股东，生成专属评估链接
- 材料上传：支持产权、图纸、电费清单等材料上传
- 项目附件：上传Word、PPT、PDF等项目文档
- 在线评估：股东通过专属链接评估项目，填写检查项、总评、投资意愿
- 自动汇总：计算平均投资意愿，80%以上视为通过
- 报告导出：导出Markdown格式的评估汇总报告

## 本地开发

```bash
cd server
npm install
node app.js
```

访问 http://localhost:3000

## 部署到Render

1. Fork/Clone此仓库到你的GitHub
2. 在Render上创建新的Web Service
3. 连接GitHub仓库
4. 设置：
   - Build Command: `cd server && npm install`
   - Start Command: `cd server && node app.js`
5. 部署完成

## 技术栈

- 前端：纯HTML/CSS/JavaScript
- 后端：Node.js + Express
- 文件上传：Multer
- 数据库：JSON文件（简易版）
