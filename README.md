# Text-to-CAD 3D模型生成器

这是一个基于文本描述生成3D模型的Web应用。用户可以输入文本描述，系统会自动生成对应的3D模型，并支持STEP和STL格式的导出。

## 功能特点

- 文本到3D模型的自动生成
- 支持STEP文件导出
- 实时3D预览（STL格式）
- 可调节的模型透明度
- 支持模型旋转和缩放查看

## 环境要求

- Node.js 16.0 或更高版本
- Python 3.7 或更高版本
- Visual C++ Build Tools（Windows用户需要）

## 安装步骤

1. 安装 Node.js 依赖：
```bash
npm install
```

2. 安装 Python 依赖：

首先确保您已安装Python和pip，然后运行：
```bash
pip install -r requirements.txt
```

注意：如果在Windows上安装遇到问题，请先：
- 安装 [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
- 选择安装"C++ 构建工具"工作负载

3. 配置环境：
- 确保您有可用的 KittyCAD API 密钥
- 在 `src/app/api/text-to-cad/route.ts` 中配置您的API密钥

## 运行应用

开发模式运行：
```bash
npm run dev
```

然后在浏览器中访问：`http://localhost:3000`

## 使用说明

1. 在文本框中输入您想要生成的3D模型描述
2. 点击"运行"按钮
3. 等待模型生成和显示
4. 可以：
   - 使用鼠标旋转查看模型
   - 使用滚轮缩放模型
   - 下载STEP文件
   - 调整模型透明度

## 常见问题

1. Python包安装失败：
   - 确保已安装Visual C++ Build Tools
   - 尝试单独安装问题包
   - 检查Python版本兼容性

2. 模型生成失败：
   - 检查API密钥是否正确
   - 确保文本描述清晰且符合要求
   - 查看控制台错误信息

## 技术栈

- 前端：Next.js, Three.js, TailwindCSS
- 后端：Next.js API Routes
- 3D处理：OpenCASCADE (python-occ-core)
- API：KittyCAD API
