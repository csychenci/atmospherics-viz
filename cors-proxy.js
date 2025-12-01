import http from 'http';
import https from 'https';
import url from 'url';

const PORT = 3001;

// 创建 HTTP 服务器
const server = http.createServer((req, res) => {
    // 设置 CORS 头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // 处理 OPTIONS 预检请求
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // 解析请求 URL
    const parsedUrl = url.parse(req.url, true);
    const targetUrl = parsedUrl.query.url;

    if (!targetUrl) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            error: '缺少 url 参数', 
            usage: 'http://localhost:3001/?url=https://example.com' 
        }));
        return;
    }

    console.log(`[${new Date().toISOString()}] 代理请求: ${targetUrl}`);

    try {
        const targetParsed = url.parse(targetUrl);
        const isHttps = targetParsed.protocol === 'https:';
        const httpModule = isHttps ? https : http;

        // 清理请求头，移除可能导致问题的头部
        const cleanHeaders = { ...req.headers };
        delete cleanHeaders.host;
        delete cleanHeaders.origin;
        delete cleanHeaders.referer;
        delete cleanHeaders['user-agent'];

        const options = {
            hostname: targetParsed.hostname,
            port: targetParsed.port || (isHttps ? 443 : 80),
            path: targetParsed.path,
            method: req.method,
            headers: {
                ...cleanHeaders,
                host: targetParsed.hostname,
                'user-agent': 'Mozilla/5.0 (compatible; CORS-Proxy/1.0)'
            }
        };

        const proxyReq = httpModule.request(options, (proxyRes) => {
            // 复制响应头
            Object.keys(proxyRes.headers).forEach(key => {
                res.setHeader(key, proxyRes.headers[key]);
            });

            // 设置状态码
            res.writeHead(proxyRes.statusCode);

            // 转发响应数据
            proxyRes.pipe(res);
        });

        proxyReq.on('error', (err) => {
            console.error(`代理请求错误: ${err.message}`);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                error: '代理请求失败', 
                message: err.message 
            }));
        });

        // 转发请求体（如果有）
        req.pipe(proxyReq);

    } catch (err) {
        console.error(`URL 解析错误: ${err.message}`);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            error: 'URL 格式错误', 
            message: err.message 
        }));
    }
});

server.listen(PORT, () => {
    console.log(`🚀 CORS 代理服务器已启动`);
    console.log(`📍 监听端口: ${PORT}`);
    console.log(`🔗 使用方式: http://localhost:${PORT}/?url=目标URL`);
    console.log(`📝 示例: http://localhost:${PORT}/?url=https://ims.windy.com/im/v3.0/forecast/ecmwf-hres/2025102618/2025102706/wm_grid_257/3/6/2/wind-surface.jpg`);
    console.log(`⏹️  停止服务: Ctrl+C`);
});

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n🛑 正在关闭代理服务器...');
    server.close(() => {
        console.log('✅ 代理服务器已关闭');
        process.exit(0);
    });
});