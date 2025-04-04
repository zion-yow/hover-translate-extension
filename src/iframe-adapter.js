/**
 * iframe-adapter.js
 * 解决iframe跨域通信的专用适配器
 * 可以作为独立脚本注入到所有frame中
 */

(function() {
  // 调试日志函数
  function debugLog(message, level = 'info') {
    const prefix = '[Hover Translate][iframe]';
    
    if (level === 'error') {
      console.error(prefix, message);
    } else if (level === 'warn') {
      console.warn(prefix, message);
    } else {
      console.log(prefix, message);
    }
  }
  
  // 在iframe中运行时的初始化
  function initializeIframeAdapter() {
    debugLog('iframe适配器已加载');
    
    // 设置跨域消息监听
    window.addEventListener('message', handleMessage);
    
    // 通知主文档iframe已准备好
    window.top.postMessage({
      type: 'hoverTranslate:iframe-ready',
      frameId: window.name || 'unnamed-frame',
      url: window.location.href,
      readyTime: Date.now()
    }, '*');
    
    // 设置DOM变化监听
    setupDOMObserver();
  }
  
  // 处理来自主文档的消息
  function handleMessage(event) {
    // 安全检查
    if (!event.data || !event.data.type || !event.data.type.startsWith('hoverTranslate:')) {
      return;
    }
    
    debugLog('收到消息: ' + event.data.type);
    
    switch (event.data.type) {
      case 'hoverTranslate:ping':
        // 响应ping请求
        window.top.postMessage({
          type: 'hoverTranslate:iframe-ready',
          frameId: event.data.frameId || window.name || 'unnamed-frame',
          url: window.location.href
        }, '*');
        break;
        
      case 'hoverTranslate:extract-text':
        // 从iframe中提取文本
        const { x, y, frameId } = event.data;
        extractAndSendText(x, y, frameId);
        break;
    }
  }
  
  // 从坐标提取文本并发送回主文档
  function extractAndSendText(x, y, frameId) {
    try {
      // 获取坐标下的元素
      const element = document.elementFromPoint(x, y);
      
      if (!element) {
        sendResponse(frameId, false, null, '找不到坐标下的元素');
        return;
      }
      
      // 获取元素的文本
      let text = '';
      
      // 检查特殊属性如title和alt
      if (element.title && element.title.trim()) {
        text = element.title;
      } else if (element.alt && element.alt.trim()) {
        text = element.alt;
      } else {
        // 获取最近的文本节点
        const walker = document.createTreeWalker(
          element,
          NodeFilter.SHOW_TEXT,
          { acceptNode: node => node.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT }
        );
        
        const textNode = walker.nextNode();
        if (textNode) {
          text = textNode.textContent.trim();
        } else {
          // 使用元素自身的文本内容
          text = element.textContent.trim();
        }
      }
      
      // 发送提取的文本
      if (text) {
        sendResponse(frameId, true, text);
      } else {
        sendResponse(frameId, false, null, '无法提取文本');
      }
      
    } catch (error) {
      sendResponse(frameId, false, null, error.message);
    }
  }
  
  // 发送响应到主文档
  function sendResponse(frameId, success, text, error) {
    window.top.postMessage({
      type: 'hoverTranslate:text-extracted',
      frameId: frameId,
      success: success,
      text: text,
      error: error
    }, '*');
  }
  
  // 监听DOM变化，以重新注册消息处理
  function setupDOMObserver() {
    const observer = new MutationObserver((mutations) => {
      let significantChange = false;
      
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          significantChange = true;
          break;
        }
      }
      
      if (significantChange && window.top !== window.self) {
        // iframe内容发生变化，通知主文档
        window.top.postMessage({
          type: 'hoverTranslate:iframe-updated',
          frameId: window.name || 'unnamed-frame',
          url: window.location.href,
          updateTime: Date.now()
        }, '*');
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  // 仅在iframe中运行初始化
  if (window.top !== window.self) {
    // 确保只运行一次
    if (!window.__hoverTranslateIframeInitialized) {
      window.__hoverTranslateIframeInitialized = true;
      initializeIframeAdapter();
    }
  }
})();
