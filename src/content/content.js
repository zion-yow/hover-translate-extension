/**
 * 悬停翻译扩展的内容脚本
 * 该脚本随页面加载时被注入，负责监听鼠标事件、提取文本并显示翻译结果
 */

/**
 * 调试日志函数 - 根据设置的调试级别输出日志
 * @param {string} message - 要输出的消息
 * @param {string} level - 日志级别，可选值：'info'(默认)|'warn'|'error'
 * 当debugMode设置为true时或级别为error时输出日志
 */
function debugLog(message, level = 'info') {
  const prefix = '[Hover Translate]';
  
  if (level === 'error') {
    console.error(prefix, message);
  } else if (level === 'warn') {
    console.warn(prefix, message);
  } else {
    console.log(prefix, message);
  }
}

/**
 * 重构 tooltip 实现，使用 Shadow DOM 和组件化方式
 */
class TranslationTooltip {
  constructor() {
    try {
      // 清理可能存在的旧容器
      const existingContainer = document.querySelector('#hover-translate-root');
      if (existingContainer) {
        debugLog('找到旧的tooltip容器，移除中...');
        existingContainer.remove();
      }
      
      // 创建根容器 - 使用普通DOM而非Shadow DOM
      this.container = document.createElement('div');
      this.container.id = 'hover-translate-root';
      this.container.style.cssText = 'position:fixed; z-index:2147483647; display:block; visibility:visible; opacity:1; pointer-events:auto; top:0; left:0; width:100%; height:0;';
      
      // 创建样式
      const style = document.createElement('style');
      style.textContent = this.getStyleContent();
      style.id = 'hover-translate-style';
      
      // 创建 tooltip 元素
      this.tooltip = document.createElement('div');
      this.tooltip.id = 'hover-translate-tooltip';
      this.tooltip.className = 'hover-translate-tooltip';
      this.tooltip.style.cssText = 'display:none; position:absolute; background-color:#fff; border:1px solid rgba(0,0,0,0.2); border-radius:6px; box-shadow:0 3px 12px rgba(0,0,0,0.15); color:#333; font-family:sans-serif; font-size:14px; line-height:1.4; min-width:200px; max-width:400px; padding:12px; overflow-y:auto; max-height:400px; pointer-events:auto; z-index:2147483647;';
      
      // 直接添加到document.body
      try {
        document.body.appendChild(style);
        document.body.appendChild(this.container);
        this.container.appendChild(this.tooltip);
        debugLog('直接DOM模式: 样式和容器添加成功');
      } catch (appendError) {
        debugLog('添加DOM元素失败: ' + appendError.message, 'error');
        console.error('添加DOM错误详情:', appendError);
      }
      
      // 添加可见性指示器
      const indicator = document.createElement('div');
      indicator.style.cssText = 'position:absolute; width:5px; height:5px; background:red; top:0; right:0; z-index:2147483647;';
      this.container.appendChild(indicator);
      
      debugLog('Translation tooltip component initialized with direct DOM (no Shadow DOM)');
    } catch (error) {
      debugLog('创建tooltip组件失败: ' + error.message, 'error');
      console.error('错误详情:', error);
    }
  }
  
  /**
   * 获取样式内容
   * @returns {string} CSS样式内容
   */
  getStyleContent() {
    return `
      #hover-translate-tooltip {
        background-color: #fff;
        border: 1px solid rgba(0, 0, 0, 0.2);
        border-radius: 6px;
        box-shadow: 0 3px 12px rgba(0, 0, 0, 0.15);
        color: #333;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        font-size: 14px;
        line-height: 1.4;
        min-width: 200px;
        max-width: 400px;
        width: auto;
        padding: 12px;
        position: absolute;
        overflow-y: auto;
        max-height: 400px;
        pointer-events: auto;
        transition: opacity 0.15s ease-in-out;
        z-index: 2147483647;
      }
      
      #hover-translate-tooltip.short-text {
        width: auto;
        max-width: 280px;
      }
      
      #hover-translate-tooltip.medium-text {
        width: auto;
        max-width: 340px;
      }
      
      #hover-translate-tooltip.long-text {
        width: auto;
        max-width: 400px;
      }
      
      /* 日语特有样式 */
      #hover-translate-tooltip .header {
        display: flex;
        flex-direction: column;
        margin-bottom: 10px;
      }
      
      #hover-translate-tooltip .original {
        font-weight: bold;
        margin-bottom: 4px;
      }
      
      #hover-translate-tooltip .pronunciation {
        color: #666;
        font-size: 0.9em;
        font-family: 'Hiragino Kaku Gothic Pro', 'Meiryo', sans-serif;
        margin-bottom: 6px;
      }
      
      #hover-translate-tooltip .translation {
        color: #2c7be5;
        font-size: 1.05em;
        margin-bottom: 12px;
      }
      
      #hover-translate-tooltip .definitions-header, 
      #hover-translate-tooltip .examples-header {
        font-weight: bold;
        font-size: 0.9em;
        margin-top: 12px;
        margin-bottom: 6px;
        border-top: 1px solid rgba(0,0,0,0.1);
        padding-top: 8px;
      }
      
      #hover-translate-tooltip .definition {
        font-size: 0.9em;
        margin-bottom: 4px;
        line-height: 1.5;
      }
      
      #hover-translate-tooltip .example {
        margin-bottom: 10px;
        padding-left: 8px;
        border-left: 2px solid rgba(0,0,0,0.1);
      }
      
      #hover-translate-tooltip .example-translation {
        color: #2c7be5;
      }
      
      /* 深色模式支持 */
      @media (prefers-color-scheme: dark) {
        #hover-translate-tooltip {
          background-color: #2d2d2d;
          color: #e8e8e8;
          border-color: rgba(255, 255, 255, 0.2);
        }
        
        #hover-translate-tooltip .pronunciation {
          color: #aaa;
        }
        
        #hover-translate-tooltip .translation, 
        #hover-translate-tooltip .example-translation {
          color: #5a9bf6;
        }
        
        #hover-translate-tooltip .definitions-header, 
        #hover-translate-tooltip .examples-header {
          border-top-color: rgba(255, 255, 255, 0.1);
        }
        
        #hover-translate-tooltip .example {
          border-left-color: rgba(255, 255, 255, 0.1);
        }
      }
    `;
  }
  
  /**
   * 显示翻译结果
   * @param {Object} translation - 翻译结果对象
   * @param {HTMLElement} targetElement - 目标元素
   */
  show(translation, targetElement) {
    try {
      debugLog('显示翻译tooltip (原生DOM模式): ' + JSON.stringify(translation).substring(0, 100) + '...');
      
      const rect = targetElement.getBoundingClientRect();
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollLeft = window.scrollX || document.documentElement.scrollLeft;
      
      // 设置内容
      this.tooltip.innerHTML = this.formatTranslation(translation);
      
      // 根据文本长度应用不同的宽度类
      const textLength = (translation.original ? translation.original.length : 0) + 
                         (translation.translation ? translation.translation.length : 0);
      this.tooltip.classList.remove('short-text', 'medium-text', 'long-text');
      
      if (textLength < 30) {
        this.tooltip.classList.add('short-text');
      } else if (textLength < 100) {
        this.tooltip.classList.add('medium-text');
      } else {
        this.tooltip.classList.add('long-text');
      }
      
      // 强制设置样式
      this.tooltip.style.cssText = `
        position: absolute;
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        top: ${(rect.bottom + scrollTop + 10)}px;
        left: ${(rect.left + scrollLeft)}px;
        background-color: #fff;
        border: 1px solid rgba(0,0,0,0.2);
        border-radius: 6px;
        box-shadow: 0 3px 12px rgba(0,0,0,0.15);
        color: #333;
        font-family: sans-serif;
        font-size: 14px;
        line-height: 1.4;
        padding: 12px;
        max-width: 400px;
        overflow-y: auto;
        max-height: 400px;
        pointer-events: auto;
        z-index: 2147483647;
      `;
      
      // 防止超出屏幕
      setTimeout(() => this.adjustPosition(rect), 10);
      
      // 确保完全可见
      this.container.style.display = 'block';
      this.container.style.pointerEvents = 'auto';
      
      // 强制重新计算布局
      void this.container.offsetHeight;
      void this.tooltip.offsetHeight;
      
      // 测试标记 - 显示边角红点
      const marker = document.createElement('div');
      marker.style.cssText = 'position:absolute; right:0; top:0; width:8px; height:8px; background:red; border-radius:50%;';
      this.tooltip.appendChild(marker);
      
      debugLog('原生DOM模式: Tooltip显示成功 位置: top=' + this.tooltip.style.top + ', left=' + this.tooltip.style.left + 
              ', 尺寸: ' + this.tooltip.offsetWidth + 'x' + this.tooltip.offsetHeight);
    } catch (error) {
      debugLog('显示tooltip失败: ' + error.message, 'error');
      console.error('显示错误详情:', error);
    }
  }
  
  /**
   * 隐藏tooltip
   */
  hide() {
    try {
      this.tooltip.style.display = 'none';
      this.container.style.pointerEvents = 'none';
      
      // 清除内容以减少内存占用
      this.tooltip.innerHTML = '';
      
      debugLog('原生DOM模式: Tooltip已隐藏');
    } catch (error) {
      debugLog('隐藏tooltip失败: ' + error.message, 'error');
    }
  }
  
  /**
   * 调整位置避免超出屏幕
   * @param {DOMRect} targetRect - 目标元素的位置矩形
   */
  adjustPosition(targetRect) {
    try {
      const rect = this.tooltip.getBoundingClientRect();
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollLeft = window.scrollX || document.documentElement.scrollLeft;
      
      // 检查右侧溢出
      if (rect.right > window.innerWidth) {
        this.tooltip.style.left = (window.innerWidth - rect.width - 10) + 'px';
      }
      
      // 检查底部溢出
      if (rect.bottom > window.innerHeight) {
        // 尝试显示在目标元素上方
        const topPosition = targetRect.top + scrollTop - rect.height - 10;
        
        // 如果上方也放不下，放在可视区域底部
        if (topPosition < scrollTop) {
          this.tooltip.style.top = (window.innerHeight + scrollTop - rect.height - 10) + 'px';
        } else {
          this.tooltip.style.top = topPosition + 'px';
        }
      }
      
      // 添加额外处理：确保在Twitter等网站上可见
      this.ensureVisible();
      
      debugLog('原生DOM模式: 调整后位置: top=' + this.tooltip.style.top + ', left=' + this.tooltip.style.left);
    } catch (error) {
      debugLog('调整tooltip位置失败: ' + error.message, 'error');
    }
  }
  
  /**
   * 确保在受限网站上可见的特殊处理
   */
  ensureVisible() {
    try {
      // 针对Twitter等网站的特殊处理
      // if (window.location.hostname.includes('twitter.com') || window.location.hostname.includes('x.com')) {
      //   debugLog('检测到Twitter/X网站，应用特殊处理');
        
      // 移除并重新添加到DOM树顶层
      if (this.tooltip.parentNode) {
        this.tooltip.parentNode.removeChild(this.tooltip);
      }
      
      document.body.appendChild(this.tooltip);
      
      // 尝试修复样式被覆盖问题
      const currentStyles = window.getComputedStyle(this.tooltip);
      if (currentStyles.display === 'none' || currentStyles.visibility === 'hidden' || currentStyles.opacity === '0') {
        debugLog('检测到样式被覆盖，强制应用内联样式');
        
        // 设置强制可见样式
        this.tooltip.style.cssText += '; display: block !important; visibility: visible !important; opacity: 1 !important; z-index: 2147483647 !important;';
        
        // 添加强制动画效果来重新触发渲染
        this.tooltip.style.animation = 'none';
        void this.tooltip.offsetHeight; // 触发重绘
        this.tooltip.style.animation = null;
      }
      // }
    } catch (error) {
      debugLog('确保可见性处理失败: ' + error.message, 'error');
    }
  }
  
  /**
   * 格式化翻译结果为HTML
   * @param {Object} translation - 翻译结果
   * @returns {string} - HTML内容
   */
  formatTranslation(translation) {
    const sourceLanguage = translation.sourceLanguage || 'unknown';
    
    if (sourceLanguage === 'ja') {
      // 日语翻译模板
      return `
        <div class="header">
          <div class="original">${translation.original}</div>
          ${translation.pronunciation ? 
            `<div class="pronunciation">${translation.pronunciation}</div>` : ''}
        </div>
        <div class="translation">${translation.translation}</div>
        ${this.formatDefinitions(translation)}
        ${this.formatExamples(translation)}
      `;
    } else {
      // 英语翻译模板
      return `
        <div class="original">${translation.original}</div>
        <div class="translation">${translation.translation}</div>
        ${translation.pronunciation ? 
          `<div class="pronunciation">${translation.pronunciation}</div>` : ''}
        ${this.formatDefinitions(translation)}
        ${this.formatExamples(translation)}
      `;
    }
  }
  
  /**
   * 格式化定义部分
   * @param {Object} translation - 翻译结果
   * @returns {string} - 定义HTML
   */
  formatDefinitions(translation) {
    if (!translation.details || !translation.details.definitions || 
        translation.details.definitions.length === 0) {
      return '';
    }
    
    return `
      <div class="definitions-header">词义解释：</div>
      <div class="definitions">
        ${translation.details.definitions.map(def => 
          `<div class="definition">• ${def}</div>`
        ).join('')}
      </div>
    `;
  }
  
  /**
   * 格式化例句部分
   * @param {Object} translation - 翻译结果
   * @returns {string} - 例句HTML
   */
  formatExamples(translation) {
    if (!translation.examples || translation.examples.length === 0) {
      return '';
    }
    
    return `
      <div class="examples-header">例句：</div>
      <div class="examples">
        ${translation.examples.map(example => {
          let text = example;
          let translatedText = '';
          
          if (typeof example === 'object') {
            text = example.text || '';
            translatedText = example.translation || '';
          }
          
          return `
            <div class="example">
              <div class="example-text">${text}</div>
              ${translatedText ? `<div class="example-translation">${translatedText}</div>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;
  }
}

// 替换showTooltip函数
function showTooltip(translation, targetElement) {
  try {
    debugLog('调用showTooltip - 开始显示提示框', 'info');
    
    // 检查参数
    if (!translation) {
      debugLog('无效的translation参数', 'error');
      return;
    }
    
    if (!targetElement || !targetElement.getBoundingClientRect) {
      debugLog('无效的targetElement参数', 'error');
      return;
    }
    
    // 确保translationTooltip存在
    if (!translationTooltip) {
      debugLog('translationTooltip未初始化，尝试重新创建', 'warn');
      translationTooltip = new TranslationTooltip();
    }
    
    // 显示tooltip
    translationTooltip.show(translation, targetElement);
    tooltipVisible = true;
    
    debugLog('showTooltip调用完成', 'info');
  } catch (error) {
    debugLog('showTooltip异常: ' + error.message, 'error');
    console.error('完整错误信息：', error);
  }
}

// 替换hideTooltip函数
function hideTooltip() {
  translationTooltip.hide();
  tooltipVisible = false;
  
  // 确保清除高亮
  if (highlighter) {
    highlighter.clear();
  }
  
  // 重置状态
  lastExtractedRange = null;
  isHovering = false;
  
  debugLog('工具提示已隐藏');
}

/**
 * 加载用户设置
 * 在内容脚本初始化时调用，从chrome.storage读取并更新本地设置
 * 如果获取失败，保留默认设置
 */
function loadSettings() {
  debugLog('正在加载设置...');
  
  chrome.storage.sync.get([
    'enabled', 'hoverDelay', 'showPronunciation', 
    'showExamples', 'languageMode', 'jaOnly', 'enOnly', 'debugMode'
  ], (result) => {
    if (chrome.runtime.lastError) {
      debugLog('加载设置失败: ' + chrome.runtime.lastError.message, 'error');
      return;
    }
    
    // 输出调试日志，记录加载的设置
    if ('enabled' in result) debugLog(`设置[enabled]: ${result.enabled}`);
    if ('hoverDelay' in result) debugLog(`设置[hoverDelay]: ${result.hoverDelay}ms`);
    if ('languageMode' in result) debugLog(`设置[languageMode]: ${result.languageMode}`);
    
    // 更新本地设置缓存
    settings = { ...settings, ...result };
    debugLog('设置加载完成');
  });
}



/**
 * 处理鼠标悬停事件
 * 由document.mouseover事件触发
 * 实现延迟处理和智能判断，避免不必要的文本提取
 * 
 * @param {MouseEvent} event - 鼠标事件对象
 */
function handleMouseOver(event) {
  // 检查插件是否禁用
  if (!settings.enabled) {
    debugLog('翻译功能已禁用，跳过处理');
    return;
  }
  
  // 在iframe中不处理悬停事件，由主文档控制
  if (isInIframe) {
    return;
  }
  
  const element = event.target;
  const mouseX = event.clientX;
  const mouseY = event.clientY;

  // 清除现有计时器，避免重复触发
  clearTimeout(hoverTimer);
  
  // 检查是否是新的悬停或保持在同一元素上
  const isSameElement = element === lastHoveredElement;
  const distanceMoved = isSameElement ? 
    Math.sqrt(Math.pow(mouseX - lastMouseX, 2) + Math.pow(mouseY - lastMouseY, 2)) : 
    Number.MAX_VALUE;
  
  // 更新鼠标位置记录
  lastHoveredElement = element;
  lastMouseX = mouseX;
  lastMouseY = mouseY;
  
  // 鼠标移动明显或目标元素变化时，重置悬停状态
  if (distanceMoved > 8 || !isSameElement) {
    // 重置提取状态
    isExtracting = false;

    // 如果当前有提示显示，隐藏它
    if (tooltipVisible) {
      hideTooltip();
    }
    
    // 取消所有進行中的API請求
    cancelPendingRequests();
    
    // 重置悬停状态
    hoverStartTime = Date.now();
    mouseMoveCount = 0;
    isHovering = true;
    
    // 检查元素是否为iframe
    if (element.tagName === 'IFRAME') {
      lastHoveredIframe = element;
      debugLog(`悬停在iframe上: ${element.src ? element.src.substring(0, 50) : '无src属性'}`);
    } else {
      lastHoveredIframe = null;
    }
    
    debugLog(`开始新的悬停 - 元素: ${element.nodeName}, 位置: (${mouseX}, ${mouseY})`);
  } else {
    // 鼠标仍在同一元素上，增加移动计数
    mouseMoveCount++;
  }
  
  // 设置延时触发文本提取
  // 在settings.hoverDelay毫秒后触发，由settings.hoverDelay控制
  hoverTimer = setTimeout(() => {
    // 再次检查鼠标是否仍在同一位置附近
    const currentTime = Date.now();
    const hoverDuration = currentTime - hoverStartTime;
    
    // 确保满足所有条件:
    // 1. 鼠标悬停足够长时间
    // 2. 在延迟期间鼠标没有移动太多
    // 3. 当前没有正在进行的提取
    if (
      hoverDuration >= settings.hoverDelay && 
      isHovering && 
      !isExtracting && 
      mouseMoveCount < 15  // 鼠标移动次数阈值
    ) {
      debugLog(`悬停条件满足 - 持续时间: ${hoverDuration}ms, 移动计数: ${mouseMoveCount}`);
      
      // 确认鼠标位置距离记录位置不远
      const currentDistance = Math.sqrt(
        Math.pow(event.clientX - mouseX, 2) + 
        Math.pow(event.clientY - mouseY, 2)
      );
      
      if (currentDistance < 10) {  // 15像素的容差
        // 检查是否为iframe
        if (element.tagName === 'IFRAME') {
          try {
            handleIframeHover(element, mouseX, mouseY);
          } catch (error) {
            debugLog('处理iframe悬停失败: ' + error.message, 'error');
          }
        } else {
          // 标准元素处理：启动文本提取和翻译
          triggerTextExtraction(element, mouseX, mouseY);
        }
      } else {
        debugLog('鼠标已经移动太远，取消提取');
        isHovering = false;
      }
    } else {
      debugLog(`悬停条件未满足 - 持续时间: ${hoverDuration}ms, 移动计数: ${mouseMoveCount}, 提取中: ${isExtracting}`);
    }
  }, settings.hoverDelay);
}

/**
 * 处理iframe元素的悬停
 * @param {HTMLIFrameElement} iframe - iframe元素
 * @param {number} mouseX - 鼠标X坐标
 * @param {number} mouseY - 鼠标Y坐标
 */
function handleIframeHover(iframe, mouseX, mouseY) {
  // 防止重复处理
  if (isExtracting) {
    debugLog('已有提取任务正在进行，跳过iframe处理');
    return;
  }
  
  isExtracting = true;
  debugLog('处理iframe内容...');
  
  try {
    // 获取iframe相对于视口的位置
    const rect = iframe.getBoundingClientRect();
    
    // 计算鼠标在iframe内的相对坐标
    const iframeX = mouseX - rect.left;
    const iframeY = mouseY - rect.top;
    
    // 生成唯一标识符
    const frameId = 'frame_' + Date.now();
    
    // 尝试向iframe发送消息
    iframe.contentWindow.postMessage({
      type: 'hoverTranslate:extract-text',
      x: iframeX,
      y: iframeY,
      frameId
    }, '*');
    
    // 设置超时处理
    setTimeout(() => {
      if (isExtracting) {
        debugLog('iframe未响应，取消提取', 'warn');
        isExtracting = false;
      }
    }, 1000);
    
  } catch (error) {
    debugLog('iframe通信错误: ' + error.message, 'error');
    // 处理跨域iframe的情况：直接使用iframe元素作为目标
    if (error.name === 'SecurityError' || error.name === 'DOMException') {
      debugLog('检测到跨域iframe，使用备用处理方法');
      
      // 创建一个模拟结果，表明这是跨域iframe
      const fallbackText = '(无法访问跨域iframe内容)';
      translateText(fallbackText, iframe);
    }
    
    isExtracting = false;
  }
}

/**
 * 触发文本提取
 * 由handleMouseOver调用
 * 提取鼠标位置的文本并进行翻译
 * 
 * @param {HTMLElement} element - 鼠标悬停的元素
 * @param {number} mouseX - 鼠标X坐标 
 * @param {number} mouseY - 鼠标Y坐标 
 */
function triggerTextExtraction(element, mouseX, mouseY) {
  try {
    // 防止重复提取
    if (isExtracting) {
      debugLog('已有提取任务正在进行，跳过');
      return;
    }
    
    // 记录开始时间，用于计算处理时间
    const startTime = Date.now();
    
    // 设置状态标志
    isExtracting = true;
    isHovering = true;
    debugLog(`开始文本提取, 目标元素: ${element.tagName}, 坐标: (${mouseX}, ${mouseY})`);
    
    // 提取文本并翻译
    try {
      const result = extractDOMText(element, mouseX, mouseY);
      if (result) {
        // 计算提取耗时
        const extractTime = Date.now() - startTime;
        debugLog(`提取文本成功: "${result.substring(0, 50)}${result.length > 50 ? '...' : ''}" (耗时:${extractTime}ms)`);
        
        // 如果鼠标已经移动到其他位置，取消后续处理
        if (Math.abs(mouseX - lastMouseX) > 15 || Math.abs(mouseY - lastMouseY) > 15) {
          debugLog('鼠标已移动到新位置，取消翻译', 'warn');
          isExtracting = false;
          isHovering = false;
          return;
        }
        
        // 检查是否仍然需要翻译
        if (!isHovering) {
          debugLog('悬停状态已结束，取消翻译', 'warn');
          isExtracting = false;
          return;
        }
        
        // 发送翻译请求
        translateText(result, element);
      } else {
        debugLog('没有找到可翻译的文本', 'warn');
        isExtracting = false;
        isHovering = false;
      }
    } catch (error) {
      debugLog('文本提取失败: ' + error.message, 'error');
      console.error('提取错误详情:', error);
      isExtracting = false;
      isHovering = false;
    }
  } catch (error) {
    debugLog('触发文本提取过程中发生错误: ' + error.message, 'error');
    console.error('触发错误详情:', error);
    // 确保无论如何都重置状态
    isExtracting = false;
    isHovering = false;
  }
}

/**
 * 处理鼠标离开事件
 * 由document.mouseout事件触发
 * 处理鼠标离开目标元素的情况，决定是否隐藏翻译提示
 * 
 * @param {MouseEvent} event - 鼠标事件对象
 */
function handleMouseOut(event) {
  // 禁用时直接返回
  if (!settings.enabled) return;
  
  // 重置悬停状态
  isHovering = false;
  
  // 清除延时器
  clearTimeout(hoverTimer);
  
  // 清除高亮
  if (highlighter) {
    highlighter.clear();
    debugLog('鼠标离开元素，清除高亮');
  }
  
  // 只有在提示框未显示或提示框包含鼠标离开的元素时才清理
  // 这样如果鼠标从原始元素移动到提示框不会取消
  if (!tooltipVisible || !translationTooltip.container ||
      (event.relatedTarget && translationTooltip.container.contains(event.relatedTarget))
  ) {
    return;
  }
  
  // 标记悬停已结束
  isHovering = false;
  
  // 取消進行中的請求 (无论是否显示提示框都要取消)
  if (isExtracting) {
    debugLog('鼠标离开元素，取消进行中的请求');
    cancelPendingRequests();
  }
  
  // 如果没有显示工具提示，不需要处理
  if (!tooltipVisible) {
    return;
  }
  
  // 小延迟确认鼠标真的离开了
  // 防止鼠标在元素边缘快速移动时提示框闪烁
  setTimeout(() => {
    // 检查鼠标是否仍在原元素或工具提示上
    const isOnTooltip = translationTooltip && translationTooltip.container && 
                        translationTooltip.container.matches(':hover');
    const isStillOnElement = lastHoveredElement && lastHoveredElement.matches(':hover');
    
    if (!isOnTooltip && !isStillOnElement) {
      // 鼠标确实已经离开，取消所有请求并隐藏提示
      cancelPendingRequests();
      hideTooltip();
    }
  }, 200);
}

/**
 * 处理鼠标点击事件
 * 由document.click事件触发
 * 当用户点击页面非提示框区域时隐藏提示框
 * 
 * @param {MouseEvent} event - 鼠标事件对象
 */
function handleClick(event) {
  // 点击提示框外部时隐藏提示框
  if (tooltipVisible && !translationTooltip.container.contains(event.target)) {
    hideTooltip();
  }
}

/**
 * 检查元素是否应该跳过翻译
 * 由handleMouseOver调用
 * 过滤掉表单元素、链接等不需要翻译的元素
 * 
 * @param {HTMLElement} element - 要检查的DOM元素
 * @returns {boolean} - 如果应该跳过返回true，否则返回false
 */


/**
 * 从元素获取文本
 * 不直接使用，已被更精确的extractDOMText代替
 * 保留用于兼容和备用
 * 
 * @param {HTMLElement} element - 目标DOM元素
 * @returns {string} - 提取的文本
 */
function getTextFromElement(element) {
  // 获取选中文本（如果有）
  const selection = window.getSelection();
  if (selection && !selection.isCollapsed) {
    return selection.toString().trim();
  }
  
  // 否则获取悬停元素的文本
  return element.textContent.trim();
}

/**
 * 语言检测函数
 * 由translateText调用
 * 根据文本特征和设置决定是否翻译以及翻译方向
 * 
 * @param {string} text - 要检测的文本
 * @returns {string} - 检测到的语言代码：'ja'|'en'|'skip'|'unknown'
 */
function detectLanguage(text) {
  // 语言检测逻辑
  const hasJapanese = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf]/.test(text);
  const hasEnglish = /[a-zA-Z]/.test(text);
  
  // 根据languageMode设置判断是否翻译
  if (settings.languageMode === 'ja' && !hasJapanese) {
    debugLog('仅日语模式：跳过非日语文本');
    return 'skip';
  }
  
  if (settings.languageMode === 'en' && !hasEnglish) {
    debugLog('仅英语模式：跳过非英语文本');
    return 'skip';
  }
  
  // 正常的语言检测逻辑
  if (hasJapanese) return 'ja';
  if (hasEnglish) return 'en';
  return 'unknown';
}

/**
 * 翻译文本函数
 * 由startExtraction调用
 * 将提取的文本发送到background.js处理翻译请求
 * 
 * @param {string} text - 要翻译的文本
 * @param {HTMLElement} targetElement - 原始目标元素，用于定位提示框
 */
function translateText(text, targetElement) {
  // 截断过长文本
  const maxLength = 100;
  const truncatedText = text.length > maxLength 
    ? text.substring(0, maxLength) + '...' 
    : text;
  
  // 检测源语言
  const sourceLanguage = detectLanguage(truncatedText);
  debugLog(`检测源语言: ${sourceLanguage}, 文本: "${truncatedText.substring(0, 20)}..."`);
  
  // 跳过不需要翻译的语言
  if (sourceLanguage === 'skip') {
    debugLog('根据语言设置跳过翻译');
    isExtracting = false;
    return;
  }
  
  try {
    // 生成唯一请求ID，用于跟踪
    const requestId = Date.now().toString();
    window._pendingRequests = window._pendingRequests || {};
    window._pendingRequests[requestId] = true;
    
    // 记录当前鼠标位置和时间戳，用于后续检查
    const mouseX = lastMouseX;
    const mouseY = lastMouseY;
    const requestTime = Date.now();
    
    // 清除之前的取消标志
    window._translationCancelled = false;
    window._translationCancelTime = 0;

    debugLog(`发送翻译请求(ID:${requestId}): ${truncatedText.substring(0, 30)}...`);
    
    // 发送消息到后台脚本进行翻译，添加源语言信息
    // background.js中的chrome.runtime.onMessage监听器处理该请求
    chrome.runtime.sendMessage(
      { 
        action: 'translate', 
        text: truncatedText,
        sourceLanguage: sourceLanguage,
        requireDetails: true, // 请求详细信息
        requestId: requestId  // 添加请求ID用于跟踪
      },
      (response) => {
        // 检查请求是否已被取消
        // if (window._pendingRequests.cancelled || !window._pendingRequests[requestId]) {
        //   debugLog(`忽略已取消的翻译请求(ID:${requestId})响应`, 'warn');
        //   isExtracting = false;
        //   return;
        // }
        
        // 检查全局取消标志
        if (window._translationCancelled && window._translationCancelTime > requestTime) {
          debugLog(`全局取消标志已设置，忽略响应(ID:${requestId})`, 'warn');
          isExtracting = false;
          return;
        }
        
        // 检查请求发送后用户是否已经移动鼠标
        if (Math.abs(lastMouseX - mouseX) > 15 || Math.abs(lastMouseY - mouseY) > 15) {
          debugLog(`鼠标已移动，忽略翻译响应(ID:${requestId})`, 'warn');
          isExtracting = false;
          return;
        }
        
        // 检查请求发送后是否已经不在悬停状态
        if (!isHovering) {
          debugLog(`已不在悬停状态，忽略翻译响应(ID:${requestId})`, 'warn');
          isExtracting = false;
          return;
        }
        
        // 删除已完成的请求记录
        delete window._pendingRequests[requestId];
        
        // 检查是否有错误
        if (chrome.runtime.lastError) {
          debugLog('发送消息错误: ' + chrome.runtime.lastError.message, 'error');
          showFallbackTranslation(truncatedText, targetElement, sourceLanguage);
          isExtracting = false;
          return;
        }
        
        // 显示翻译结果
        if (response && !response.error) {
          debugLog(`收到翻译响应(ID:${requestId})`);
          showTooltip(response, targetElement);
          isExtracting = false;
        } else {
          debugLog('翻译错误: ' + (response ? response.error : '无响应'), 'error');
          showFallbackTranslation(truncatedText, targetElement, sourceLanguage);
          isExtracting = false;
        }
      }
    );
  } catch (error) {
    debugLog('sendMessage异常: ' + error.message, 'error');
    showFallbackTranslation(truncatedText, targetElement, sourceLanguage);
    isExtracting = false;
  }
}

/**
 * 显示备用翻译
 * 在翻译服务不可用或出错时由translateText调用
 * 提供基本反馈而不阻止用户体验
 * 
 * @param {string} text - 原始文本
 * @param {HTMLElement} targetElement - 原始目标元素
 * @param {string} sourceLanguage - 源语言代码
 */
function showFallbackTranslation(text, targetElement, sourceLanguage = 'unknown') {
  // 创建基本翻译结果
  const fallbackTranslation = {
    original: text,
    translation: '翻译服务暂不可用，请稍后再试。',
    pronunciation: '',
    examples: [],
    sourceLanguage: sourceLanguage,
    targetLanguage: 'zh',
    details: null
  };
  
  // 根据源语言添加不同的备用信息
  if (sourceLanguage === 'ja') {
    fallbackTranslation.pronunciation = '(假名注音不可用)';
  }
  
  showTooltip(fallbackTranslation, targetElement);
}

/**
 * 监听DOM变化
 * 使用MutationObserver监测页面动态加载的内容
 * 确保新加载的元素也能被正确处理
 */
function setupDOMObserver() {
  debugLog('设置DOM变化观察器');
  
  // 创建一个MutationObserver实例
  const observer = new MutationObserver((mutations) => {
    let significantChange = false;
    
    for (const mutation of mutations) {
      // 检查是否有新增节点
      if (mutation.addedNodes.length > 0) {
        for (const node of mutation.addedNodes) {
          // 只关注元素节点和包含文本的节点
          if (node.nodeType === Node.ELEMENT_NODE || 
              (node.nodeType === Node.TEXT_NODE && node.textContent.trim())) {
            significantChange = true;
            break;
          }
        }
      }
      
      // 检查属性变化（例如class、style可能影响可见性）
      if (mutation.type === 'attributes') {
        const target = mutation.target;
        if (target.nodeType === Node.ELEMENT_NODE) {
          // 检查是否是重要属性
          if (['style', 'class', 'hidden', 'display'].includes(mutation.attributeName)) {
            significantChange = true;
            break;
          }
        }
      }
      
      if (significantChange) break;
    }
    
    if (significantChange) {
      debugLog('检测到DOM重要变化，刷新处理');
      
      // 当前显示的tooltip可能需要重新定位或隐藏
      if (tooltipVisible && lastExtractedRange) {
        // 可能的改进：检查lastExtractedRange.node是否仍在文档中
        // 这里简单处理：隐藏当前tooltip
        hideTooltip();
      }
    }
  });
  
  // 配置观察选项
  const config = {
    childList: true,     // 监视子节点变化
    subtree: true,       // 监视所有后代节点
    attributes: true,    // 监视属性变化
    characterData: true  // 监视文本变化
  };
  
  // 开始观察整个文档
  observer.observe(document.body, config);
  
  // 返回观察器实例，以便将来可能需要断开
  return observer;
}

// 在文档加载完成后设置DOM观察器
// const domObserver = setupDOMObserver();

/**
 * 提取DOM文本 - 改进版，模仿10ten-ja-reader的实现
 * @param {HTMLElement} element - 鼠标悬停的元素
 * @param {number} cursorX - 鼠标X坐标
 * @param {number} cursorY - 鼠标Y坐标
 * @returns {Promise<string>} - 提取的文本
 */
function extractDOMText(element, cursorX, cursorY) {
  // 清除现有高亮
  if (highlighter) {
    highlighter.clear();
  }
  
  debugLog('精确提取文本中...');
  
  // 缓存上次结果，避免不必要的处理
  let cache = window._extractTextCache;
  if (cache) {
    const dx = cache.point.x - cursorX;
    const dy = cache.point.y - cursorY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // 如果鼠标位置相近(4px内)，直接返回缓存的结果
    if (dist < 4 && cache.result) {
      debugLog('使用缓存的文本结果');
      
      // 如果有保存范围信息且highlighter可用，恢复高亮
      if (cache.range && highlighter) {
        highlighter.highlightRange(cache.range);
      }
      
      return cache.result.text;
    }
  }
  
  try {
    // 第一步：获取位置下的所有元素(删除重复)
    const elements = [...new Set(document.elementsFromPoint(cursorX, cursorY))];
    
    // 跳过tooltip本身
    const filteredElements = elements.filter(el => {
      return el !== translationTooltip.container && 
             !translationTooltip.container.contains(el);
    });
    
    if (filteredElements.length === 0) {
      debugLog('没有找到有效元素');
      return null;
    }
    
    // 第二步：获取文本节点和偏移量
    const position = getCursorPosition(cursorX, cursorY, filteredElements);
    
    if (position && position.offsetNode && 
        position.offsetNode.nodeType === Node.TEXT_NODE) {
      const textNode = position.offsetNode;
      const offset = position.offset;
      
      debugLog(`找到文本节点，偏移量: ${offset}, 内容: ${textNode.textContent.substring(0, 20)}...`);
      
      // 创建范围并扩展选择
      const range = document.createRange();
      range.setStart(textNode, offset);
      range.setEnd(textNode, offset);
      
      // 扩展选择范围
      expandSelectionByLanguage(range);
      
      const selectedText = range.toString().trim();
      
      if (selectedText) {
        // 高亮选中的文本
        if (highlighter) {
          highlighter.highlightRange(range);
        }
        
        // 缓存结果
        window._extractTextCache = {
          point: { x: cursorX, y: cursorY },
          position,
          range,
          result: { text: selectedText, textRange: range }
        };
        
        debugLog(`提取文本成功: "${selectedText.substring(0, 30)}${selectedText.length > 30 ? '...' : ''}"`);
        return selectedText;
      }
    }
    
    // 第三步：如果没有找到文本节点，尝试从元素获取文本
    for (const elem of filteredElements) {
      const text = getTextFromRandomElement(elem);
      if (text) {
        // 缓存结果
        window._extractTextCache = {
          point: { x: cursorX, y: cursorY },
          position: null,
          range: null,
          result: { text, textRange: null }
        };
        
        debugLog(`从元素属性获取文本: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`);
        return text;
      }
    }
    
    // 如果未找到文本但位置相近，使用上次结果
    if (cache) {
      const dx = cache.point.x - cursorX;
      const dy = cache.point.y - cursorY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < 10 && cache.result) {
        debugLog('鼠标位置接近，复用上次结果');
        return cache.result.text;
      }
    }
    
  } catch (error) {
    debugLog(`文本提取错误: ${error.message}`, 'error');
  }
  
  // 重置缓存
  window._extractTextCache = undefined;
  
  // 备用：使用元素内容
  return element.textContent?.trim().substring(0, 100) || '';
}

/**
 * 获取光标位置信息
 * @param {number} x - 鼠标X坐标
 * @param {number} y - 鼠标Y坐标
 * @param {Element[]} elements - 光标位置处的元素数组
 * @returns {Object|null} 包含offsetNode和offset的对象，或null
 */
function getCursorPosition(x, y, elements) {
  // 首先尝试标准API: caretPositionFromPoint
  if (document.caretPositionFromPoint) {
    const position = document.caretPositionFromPoint(x, y);
    if (position && position.offsetNode && 
        position.offsetNode.nodeType === Node.TEXT_NODE) {
      return position;
    }
  }
  
  // 备选方法: caretRangeFromPoint (WebKit/Blink)
  if (document.caretRangeFromPoint) {
    const range = document.caretRangeFromPoint(x, y);
    if (range && range.startContainer && 
        range.startContainer.nodeType === Node.TEXT_NODE) {
      return {
        offsetNode: range.startContainer,
        offset: range.startOffset
      };
    }
  }
  
  // 尝试遍历查找文本节点
  for (const elem of elements) {
    // 跳过特殊元素
    if (elem.tagName === 'IFRAME') continue;
    
    // 使用TreeWalker查找最近的文本节点
    const walker = document.createTreeWalker(
      elem,
      NodeFilter.SHOW_TEXT,
      { acceptNode: node => node.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT }
    );
    
    // 获取第一个文本节点
    const textNode = walker.nextNode();
    if (textNode) {
      return {
        offsetNode: textNode,
        offset: Math.min(5, Math.floor(textNode.textContent.length / 2))
      };
    }
  }
  
  return null;
}

/**
 * 根据语言特性扩展文本选择
 * @param {Range} range - 要扩展的DOM范围
 */
function expandSelectionByLanguage(range) {
  if (!range || !range.startContainer || 
      range.startContainer.nodeType !== Node.TEXT_NODE) return;
  
  const textNode = range.startContainer;
  const text = textNode.textContent;
  const startOffset = range.startOffset;
  
  // 确定开始字符的语言特性
  const char = text.charAt(startOffset) || '';
  const isJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(char);
  
  // 定义分隔符模式
  const jpSeparators = /[\s\n.,。、！!?？；;：:'"）)」】］]』〕｝》〉]/;
  const enSeparators = /[\s\n.,;:!?()[\]{}'"]/;
  
  let start = startOffset;
  let end = startOffset;
  
  if (isJapanese) {
    // 日语文本处理 - 向前搜索
    while (start > 0) {
      const prevChar = text.charAt(start - 1);
      if (jpSeparators.test(prevChar)) break;
      start--;
    }
    
    // 向后搜索
    while (end < text.length) {
      const nextChar = text.charAt(end);
      if (jpSeparators.test(nextChar)) break;
      end++;
    }
  } else {
    // 英语/拉丁文本处理
    while (start > 0) {
      const prevChar = text.charAt(start - 1);
      if (enSeparators.test(prevChar)) break;
      start--;
    }
    
    while (end < text.length) {
      const nextChar = text.charAt(end);
      if (enSeparators.test(nextChar)) break;
      end++;
    }
  }
  
  // 超长文本保护
  const MAX_LENGTH = 100;
  if (end - start > MAX_LENGTH) {
    // 根据光标位置保留较近部分
    if (startOffset - start > end - startOffset) {
      // 光标偏左，保留右侧
      start = end - MAX_LENGTH;
    } else {
      // 光标偏右，保留左侧
      end = start + MAX_LENGTH;
    }
  }
  
  // 应用新范围
  range.setStart(textNode, start);
  range.setEnd(textNode, end);
}


/**
 * 从元素获取文本
 * 从元素属性（如title、alt）中获取可翻译文本
 * @param {Element} elem - DOM元素
 * @returns {string|null} - 提取的文本或null
 */
function getTextFromRandomElement(elem) {
  // 跳过iframe (会有自己的内容脚本)
  if (elem.nodeName === 'IFRAME') return null;
  
  // 检查常见的文本属性
  if (elem.title && elem.title.trim().length) {
    return elem.title;
  }
  
  if ('alt' in elem && elem.alt && elem.alt.trim().length) {
    // 忽略默认的"画像"等无意义alt文本
    if (elem.alt !== '画像') {
      return elem.alt;
    }
  }
  
  // 检查表单元素
  if (elem.nodeName === 'OPTION') {
    return elem.text;
  }
  
  if (elem.nodeName === 'SELECT' && elem.options.length) {
    return elem.options[elem.selectedIndex].text;
  }
  
  // 尝试获取input/textarea的value
  if ((elem.nodeName === 'INPUT' || elem.nodeName === 'TEXTAREA') && 
      (elem.type === 'text' || elem.type === 'textarea')) {
    return elem.value;
  }
  
  return null;
}

/**
 * 文本高亮器类
 * 创建和管理文本高亮效果的工具类
 * 在内容脚本加载时实例化为全局单例
 */
class TextHighlighter {
  /**
   * 高亮DOM元素容器 - 存储所有高亮元素的顶层容器
   * @type {HTMLDivElement}
   */
  highlightContainer = null;
  
  /**
   * 当前高亮的元素数组
   * @type {Array<HTMLElement>}
   */
  highlightElements = [];
  
  /**
   * 构造函数 - 初始化高亮器
   * 创建容器和样式，设置滚动监听
   */
  constructor() {
    // 清理可能存在的旧容器
    const existingContainer = document.querySelector('.hover-translate-container');
    if (existingContainer) {
      existingContainer.remove();
    }
    
    // 创建独立容器 - 覆盖整个页面但不影响交互
    this.highlightContainer = document.createElement('div');
    this.highlightContainer.className = 'hover-translate-container';
    this.highlightContainer.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:2147483646;';
    document.body.appendChild(this.highlightContainer);
    
    // 确认高亮容器已添加到DOM
    if (document.body.contains(this.highlightContainer)) {
      debugLog('高亮容器已成功添加到DOM');
    } else {
      debugLog('高亮容器添加失败', 'error');
    }
    
    // 创建高亮样式 - 独立样式避免被页面CSS覆盖
    const styleId = 'hover-translate-highlight-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        .hover-translate-highlight-mask {
          position: absolute;
          background-color: rgba(255, 220, 0, 0.35);
          border: 1px solid rgba(230, 150, 0, 0.8);
          border-radius: 2px;
          box-shadow: 0 0 3px rgba(230, 150, 0, 0.4);
          pointer-events: none;
          z-index: 2147483646;
        }
        
        @media (prefers-color-scheme: dark) {
          .hover-translate-highlight-mask {
            background-color: rgba(255, 220, 0, 0.4);
            border: 1px solid rgba(255, 160, 0, 0.9);
            box-shadow: 0 0 4px rgba(255, 160, 0, 0.7);
          }
        }
      `;
      document.head.appendChild(style);
      debugLog('高亮样式已添加到head');
    }
    
    // 监听页面滚动以更新高亮位置
    window.addEventListener('scroll', () => this.updatePositions(), { passive: true });
    
    debugLog('Highlighter initialized');
  }
  
  /**
   * 高亮文本范围
   * 根据DOM范围创建覆盖高亮效果
   * 
   * @param {Range} range - DOM范围对象
   */
  highlightRange(range) {
    if (!range) {
      debugLog('高亮失败: range参数为空', 'error');
      return;
    }
    
    this.clear();
    
    try {
      debugLog(`开始高亮文本: "${range.toString().substring(0, 30)}${range.toString().length > 30 ? '...' : ''}"`);
      
      const scrollX = window.scrollX || document.documentElement.scrollLeft;
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      
      // 获取可视区域尺寸
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // 获取范围的位置矩形
      const rects = range.getClientRects();
      if (!rects || rects.length === 0) {
        debugLog('高亮失败: 无法获取文本位置矩形', 'warn');
        return;
      }
      
      debugLog(`获取到${rects.length}个矩形区域`);
      
      // 使用DocumentFragment减少DOM重绘
      const fragment = document.createDocumentFragment();
      let count = 0;
      
      // 最多处理5个矩形区域，避免性能问题
      const maxRects = Math.min(rects.length, 5);
      
      for (let i = 0; i < maxRects; i++) {
        const rect = rects[i];
        // 忽略太小的矩形
        if (rect.width < 2 || rect.height < 2) continue;
        
        // 检查是否在可视区域内
        const clientLeft = rect.left;
        const clientTop = rect.top;
        const isInViewport = (
          clientTop + rect.height > 0 &&
          clientTop < viewportHeight &&
          clientLeft + rect.width > 0 &&
          clientLeft < viewportWidth
        );
        
        if (!isInViewport) {
          debugLog(`跳过矩形 #${i+1}: 不在可视区域内`);
          continue;
        }
        
        // 创建高亮遮罩
        const mask = document.createElement('div');
        mask.className = 'hover-translate-highlight-mask';
        
        // 更醒目的样式
        const style = {
          left: (rect.left + scrollX) + 'px',
          top: (rect.top + scrollY) + 'px',
          width: rect.width + 'px',
          height: rect.height + 'px',
          transition: 'none',
          backgroundColor: 'rgba(255, 200, 0, 0.4)',
          border: '2px solid rgba(255, 150, 0, 0.8)',
          boxShadow: '0 0 5px rgba(255, 150, 0, 0.5)',
          zIndex: '2147483646'
        };
        
        // 一次性设置所有样式，减少回流
        Object.assign(mask.style, style);
        
        // 存储原始位置信息
        mask.dataset.originalLeft = (rect.left + scrollX) + '';
        mask.dataset.originalTop = (rect.top + scrollY) + '';
        
        // 添加测试标记，以确保能看到元素
        const marker = document.createElement('div');
        marker.style.cssText = 'position:absolute; width:6px; height:6px; background:red; border-radius:50%; top:0; left:0;';
        mask.appendChild(marker);
        
        fragment.appendChild(mask);
        this.highlightElements.push(mask);
        count++;
        
        debugLog(`添加高亮矩形 #${i+1}: ${rect.left},${rect.top} (${rect.width}x${rect.height})`);
      }
      
      // 如果没有添加任何高亮元素，不继续处理
      if (count === 0) {
        debugLog('没有任何高亮元素被添加，可能所有元素都在视图外');
        return;
      }
      
      // 一次性添加所有元素
      this.highlightContainer.appendChild(fragment);
      debugLog(`创建了${count}个高亮元素，容器现有${this.highlightContainer.children.length}个子元素`);
      
      // 验证元素是否真的出现
      setTimeout(() => {
        const visible = this.highlightElements.some(el => {
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
        });
        
        debugLog(`高亮元素可见性检查: ${visible ? '可见' : '不可见'}`);
        
        // 緊急可見性強制解決方案
        if (!visible && this.highlightElements.length > 0) {
          debugLog('应用紧急可见性修复方案', 'warn');
          
          // 移除并重新添加到DOM顶层
          this.highlightElements.forEach(el => {
            if (el.parentNode) {
              el.parentNode.removeChild(el);
            }
            
            // 确保样式更加明显
            el.style.cssText += '; background-color: rgba(255, 0, 0, 0.5) !important; border: 3px solid red !important; z-index: 2147483647 !important;';
            
            // 添加测试文本以确认元素存在
            const testText = document.createElement('div');
            testText.textContent = '高亮测试';
            testText.style.cssText = 'position:absolute; top:0; left:0; color:red; font-weight:bold; font-size:12px; text-shadow:1px 1px 2px black;';
            el.appendChild(testText);
            
            // 直接添加到body
            document.body.appendChild(el);
          });
          
          // 额外创建一个测试元素用于验证DOM操作
          const testEl = document.createElement('div');
          testEl.style.cssText = 'position:fixed; bottom:10px; right:10px; background:red; width:20px; height:20px; border-radius:50%; z-index:2147483647;';
          document.body.appendChild(testEl);
          
          setTimeout(() => {
            if (testEl.parentNode) testEl.parentNode.removeChild(testEl);
          }, 5000);
        }
      }, 100);
    } catch (e) {
      debugLog('高亮创建失败: ' + e.message, 'error');
      console.error('高亮错误详情:', e);
    }
  }
  
  /**
   * 更新高亮位置
   * 在页面滚动时保持高亮位置与文本对齐
   */
  updatePositions() {
    if (this.highlightElements.length === 0) return;
    
    // 获取当前滚动位置
    const scrollX = window.scrollX || document.documentElement.scrollLeft;
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    
    // 更新每个高亮元素的位置
    for (const el of this.highlightElements) {
      if (!el.dataset.originalLeft) continue;
      
      // 从保存的原始位置计算新位置
      const originalLeft = parseFloat(el.dataset.originalLeft);
      const originalTop = parseFloat(el.dataset.originalTop);
      
      // 计算相对于当前滚动位置的坐标
      const clientLeft = originalLeft - scrollX;
      const clientTop = originalTop - scrollY;
      
      // 检查高亮元素是否在可视区域内
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const elHeight = el.offsetHeight;
      const elWidth = el.offsetWidth;
      
      // 判断元素是否至少部分可见
      const isVisible = (
        clientTop + elHeight > 0 &&
        clientTop < viewportHeight &&
        clientLeft + elWidth > 0 &&
        clientLeft < viewportWidth
      );
      
      // 根据可见性设置元素样式
      if (isVisible) {
        el.style.display = 'block';
      } else {
        el.style.display = 'none';
      }
      
      // 设置元素位置
      el.style.left = originalLeft + 'px';
      el.style.top = originalTop + 'px';
    }
  }
  
  /**
   * 清除所有高亮
   * 移除所有高亮元素，在隐藏提示或创建新高亮前调用
   */
  clear() {
    debugLog(`清除${this.highlightElements.length}个高亮元素`);
    this.highlightElements.forEach(el => {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    });
    this.highlightElements = [];
  }
}


/**
 * 日语文本检测函数
 * 更精确地判断文本是否为日语
 * 
 * @param {string} text - 要检测的文本
 * @returns {boolean} - 是否为日语文本
 */
function isJapaneseText(text) {
  // 检测假名
  const hasKana = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);
  
  // 检测日语特有符号
  const hasJapaneseSymbols = /[\u3000-\u303F\u30FB\u301C]/.test(text);
  
  // 计算汉字占比
  const kanjiCount = (text.match(/[\u4E00-\u9FAF]/g) || []).length;
  const textLength = text.length;
  
  // 有假名直接判定为日语
  if (hasKana) return true;
  
  // 有日语符号且有一定比例的汉字也判定为日语
  if (hasJapaneseSymbols && kanjiCount / textLength > 0.1) return true;
  
  return false;
}



/**
 * 输出当前设置状态
 * 调试工具函数，可在代码任何位置调用
 * 在console中显示当前设置详情
 */
function logSettings() {
  console.log('[Hover Translate] 当前设置:', {
    enabled: settings.enabled,
    languageMode: settings.languageMode,
    hoverDelay: settings.hoverDelay
  });
}

/**
 * 应用新设置
 * 由settingsUpdated消息处理函数调用
 * 根据新旧设置的差异选择性地应用变更
 * 
 * @param {Object} oldSettings - 变更前的设置对象
 */
function applyNewSettings(oldSettings) {
  // 处理启用状态变化
  if (settings.enabled !== oldSettings.enabled) {
    if (!settings.enabled) {
      // 禁用时清理当前状态
      hideTooltip();
      if (highlighter) highlighter.clear();
      clearTimeout(hoverTimer);
    }
  }
  
  // 处理悬停延迟变化
  if (settings.hoverDelay !== oldSettings.hoverDelay) {
    debugLog(`更新悬停延迟为${settings.hoverDelay}ms`);
  }
  
  // 处理语言模式变化
  if (settings.languageMode !== oldSettings.languageMode) {
    // 如果当前有提示显示，可能需要更新
    if (tooltipVisible) {
      debugLog(`语言模式已变更为${settings.languageMode}，可能需要更新当前翻译`);
    }
  }
  
  // 处理调试模式变化
  if (settings.debugMode !== oldSettings.debugMode) {
    debugLog(`调试模式已${settings.debugMode ? '启用' : '禁用'}`);
  }
}

/**
 * 文本处理函数
 * 根据当前语言模式判断是否处理文本
 * 
 * @param {string} text - 要处理的文本
 * @returns {Object|null} - 处理结果或null(不处理)
 */
function processText(text) {
  // 检测语言
  const lang = detectLanguage(text);
  
  // 根据语言模式过滤
  switch (settings.languageMode) {
    case 'ja':
      if (lang !== 'ja') return null;
      break;
    case 'en':
      if (lang !== 'en') return null;
      break;
    case 'all':
      if (lang === 'unknown') return null;
      break;
  }
  
  return { text, lang };
}


/**
 * 测试DOM操作和可见性
 * 在页面加载后直接调用，测试是否可以创建和显示元素
 */
function testVisibility() {
  debugLog('正在测试DOM可见性...');
  
  // 创建一个测试元素
  const testEl = document.createElement('div');
  testEl.id = 'hover-translate-test-visibility';
  testEl.style.cssText = 'position:fixed; bottom:20px; right:20px; width:20px; height:20px; background:red; border-radius:50%; z-index:2147483647; opacity:0.8; box-shadow:0 0 5px rgba(0,0,0,0.5);';
  
  // 添加到页面
  document.body.appendChild(testEl);
  
  debugLog('测试元素已添加: ' + testEl.id);
  
  // 3秒后删除
  setTimeout(() => {
    if (document.body.contains(testEl)) {
      testEl.remove();
      debugLog('测试元素已移除');
    } else {
      debugLog('测试元素不在DOM中，可能已被移除', 'warn');
    }
  }, 10000);
  
  // 创建一个无ShadowDOM的测试提示
  const testTooltip = document.createElement('div');
  testTooltip.id = 'hover-translate-test-tooltip';
  testTooltip.style.cssText = 'position:fixed; bottom:50px; right:20px; width:150px; padding:10px; background:white; border:1px solid #ccc; border-radius:4px; box-shadow:0 2px 8px rgba(0,0,0,0.2); z-index:2147483647; font-family:sans-serif; font-size:12px;';
  testTooltip.innerHTML = `
    <div style="font-weight:bold;">测试提示框</div>
    <div style="margin-top:5px;color:#333;">这是一个测试提示，用于验证DOM可见性</div>
  `;
  
  document.body.appendChild(testTooltip);
  debugLog('测试提示框已添加: ' + testTooltip.id);
  
  setTimeout(() => {
    if (document.body.contains(testTooltip)) {
      testTooltip.remove();
      debugLog('测试提示框已移除');
    }
  }, 10000);
}

/**
 * 取消所有正在進行的API請求
 * 當用戶移動鼠標或切换元素時調用
 * 防止請求堆積和回調衝突
 */
function cancelPendingRequests() {
  // 這裡我們無法直接取消已發送的chrome.runtime.sendMessage，
  // 但可以通過設置標識來忽略未來的回調結果
  
  if (isExtracting) {
    debugLog('取消進行中的翻譯請求');
    window._lastCancelTime = Date.now();
  }
  
  // 重置狀態
  isExtracting = false;
  
  // 設置全局取消標誌和時間戳
  window._translationCancelled = true;
  window._translationCancelTime = Date.now();
  
  // 確保在下次翻譯時會忽略已取消請求的結果
  window._pendingRequests = window._pendingRequests || {};
  window._pendingRequests.cancelled = true;
  
  // 如果正在顯示tooltip，強制隱藏
  if (tooltipVisible) {
    debugLog('因請求取消而強制隱藏tooltip');
    hideTooltip();
  }
  
  // 取消通過setTimeout延遲執行的處理
  clearTimeout(hoverTimer);
  
  debugLog('已清除所有進行中的請求');
}
// ------------------------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------------------------


// 内容脚本加载时的通知日志
debugLog('Content script loaded');

// 检查是否在iframe中运行
const isInIframe = window.top !== window.self;
debugLog(`运行环境: ${isInIframe ? 'iframe' : '主文档'}`);

// 创建或获取全局tooltip实例
let translationTooltip;

// 处理在iframe中的情况
if (isInIframe) {
  debugLog('在iframe中运行，配置iframe适配器');
  
  // 全局监听来自主框架的消息
  window.addEventListener('message', (event) => {
    // 安全检查
    if (!event.data || !event.data.type || !event.data.type.startsWith('hoverTranslate:')) {
      return;
    }
    
    debugLog('接收到主框架消息: ' + event.data.type);
    
    switch (event.data.type) {
      case 'hoverTranslate:ping':
        // 确认iframe可用
        window.top.postMessage({ 
          type: 'hoverTranslate:iframe-ready',
          frameId: event.data.frameId || 'unknown'
        }, '*');
        break;
        
      case 'hoverTranslate:extract-text':
        // 在iframe中提取文本
        const { x, y, frameId } = event.data;
        try {
          const element = document.elementFromPoint(x, y);
          if (element) {
            const text = extractDOMText(element, x, y);
            window.top.postMessage({
              type: 'hoverTranslate:text-extracted',
              frameId,
              text,
              success: !!text
            }, '*');
          } else {
            window.top.postMessage({
              type: 'hoverTranslate:text-extracted',
              frameId,
              success: false,
              error: '未找到目标元素'
            }, '*');
          }
        } catch (error) {
          window.top.postMessage({
            type: 'hoverTranslate:text-extracted',
            frameId,
            success: false,
            error: error.message
          }, '*');
        }
        break;
    }
  });
  
  // iframe中不需要创建tooltip
  debugLog('在iframe中运行，不创建tooltip组件');
} else {
  // 主文档中创建tooltip
  translationTooltip = new TranslationTooltip();
  debugLog('Translation tooltip component created using direct DOM');
  
  // 设置iframe消息处理
  window.addEventListener('message', (event) => {
    if (!event.data || !event.data.type || !event.data.type.startsWith('hoverTranslate:')) {
      return;
    }
    
    debugLog('接收到iframe消息: ' + event.data.type);
    
    if (event.data.type === 'hoverTranslate:text-extracted' && event.data.success && event.data.text) {
      debugLog('从iframe收到提取的文本: ' + event.data.text.substring(0, 30));
      
      // 从当前活动的iframe元素获取位置
      if (lastHoveredIframe) {
        const rect = lastHoveredIframe.getBoundingClientRect();
        translateText(event.data.text, lastHoveredIframe);
        isExtracting = false;
      }
    }
  });
}

/**
 * 全局状态变量
 * 用于跟踪插件的运行状态和用户配置
 * 
 * selectedText: 当前选中的文本
 * hoverTimer: 悬停计时器引用，用于处理延迟触发
 * tooltipVisible: 当前提示框是否可见
 * settings: 用户配置，从chrome.storage读取并缓存
 */
let selectedText = '';
let hoverTimer = null;
let tooltipVisible = false;
let lastHoveredIframe = null; // 记录最后悬停的iframe
let settings = {
  enabled: true,              // 插件是否启用
  hoverDelay: 500,            // 悬停触发延迟(毫秒)
  showPronunciation: true,    // 是否显示发音
  showExamples: true,         // 是否显示例句
  languageMode: 'ja',         // 翻译模式：ja(日语)|en(英语)|all(所有)
  jaOnly: true,               // 是否仅翻译日语(兼容旧版)
  enOnly: false,              // 是否仅翻译英语(兼容旧版)
  debugMode: false            // 调试模式
};

// 内容脚本初始化时加载设置
loadSettings();

/**
 * 监听设置变化
 * 当storage发生变化时自动更新本地设置
 * 由chrome.storage.onChanged事件触发
 */
chrome.storage.onChanged.addListener((changes) => {
  let hasChanges = false;
  
  for (let key in changes) {
    if (key in settings) {
      const oldValue = settings[key];
      const newValue = changes[key].newValue;
      
      settings[key] = newValue;
      hasChanges = true;
      
      debugLog(`设置已更新[${key}]: ${oldValue} -> ${newValue}`);
    }
  }
  
  if (hasChanges) {
    debugLog('设置已更新，当前设置: ' + JSON.stringify(settings));
  }
});

/**
 * 添加页面事件监听器
 * 在内容脚本初始化时添加，处理鼠标悬停、离开和点击事件
 */
document.addEventListener('mouseover', handleMouseOver);
document.addEventListener('mouseout', handleMouseOut);
document.addEventListener('click', handleClick);
debugLog('Event listeners added');

/**
 * 全局状态变量 - 鼠标和悬停相关
 * 用于跟踪鼠标位置和悬停状态
 * 
 * lastHoveredElement: 上次悬停的元素
 * lastMouseX/Y: 上次记录的鼠标坐标
 * isExtracting: 是否正在提取文本(防止重复处理)
 * lastExtractedRange: 上次提取的文本范围
 * hoverStartTime: 当前悬停开始时间
 * mouseMoveCount: 悬停期间鼠标移动次数
 * isHovering: 是否处于悬停状态
 */
let lastHoveredElement = null;
let lastMouseX = 0;
let lastMouseY = 0;
let isExtracting = false;
let lastExtractedRange = null;
let hoverStartTime = 0;
let mouseMoveCount = 0;
let isHovering = false;



// 创建全局高亮器实例
const highlighter = new TextHighlighter();
debugLog('Highlighter instance created');

/**
 * 全局鼠标移动监听器
 * 精确跟踪鼠标移动，改善悬停检测准确性
 * 页面加载时添加，影响整个扩展的行为
 */
document.addEventListener('mousemove', (event) => {
  // 只在悬停状态下处理
  if (!isHovering) return;
  
  // 计算与上次位置的距离
  const moveDistance = Math.sqrt(
    Math.pow(event.clientX - lastMouseX, 2) + 
    Math.pow(event.clientY - lastMouseY, 2)
  );
  
  // 移动超过阈值时增加计数
  if (moveDistance > 3) {
    mouseMoveCount++;
    
    // 移动次数过多时取消悬停
    if (mouseMoveCount > 15) {
      isHovering = false;
      clearTimeout(hoverTimer);
      
      // 输出当前状态以调试
      debugLog(`鼠标移动次数超过阈值(${mouseMoveCount})，取消悬停, 当前提取状态=${isExtracting}, tooltip=${tooltipVisible}`);
      
      // 清除高亮
      if (highlighter) {
        highlighter.clear();
        debugLog('鼠标移动超出阈值，清除高亮');
      }
      
      // 取消所有正在进行的API请求
      cancelPendingRequests();
      
      // 如果正在显示工具提示，隐藏它
      if (tooltipVisible) {
        hideTooltip();
      }
    } else if (moveDistance > 30) {
      // 鼠标移动距离过大，立即取消当前请求
      debugLog(`鼠标移动距离过大(${moveDistance.toFixed(1)}px)，取消当前请求，当前提取状态=${isExtracting}`);
      
      // 清除高亮
      if (highlighter) {
        highlighter.clear();
        debugLog('鼠标移动距离过大，清除高亮');
      }
      
      cancelPendingRequests();
    } else if (moveDistance > 8) {
      // 即使小幅度移动也清除高亮，保持整洁的用户体验
      if (highlighter && highlighter.highlightElements.length > 0) {
        highlighter.clear();
        debugLog('鼠标小幅移动，清除高亮以保持界面整洁');
      }
    }
    
    // 更新记录的位置
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
  }
}, { passive: true });

/**
 * 设置更新消息处理器
 * 处理来自popup.js的设置更新消息
 * 由chrome.runtime.onMessage事件触发
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'settingsUpdated') {
    // 保存旧设置用于比较
    const oldSettings = { ...settings };
    
    // 更新设置
    settings = { ...settings, ...request.settings };
    
    // 记录变更
    debugLog('设置已更新:', {
      old: oldSettings,
      new: settings,
      changed: Object.keys(request.settings)
    });
    
    // 应用新设置
    applyNewSettings(oldSettings);
    
    // 响应消息
    sendResponse({ status: 'settings updated' });
    return true;
  }
  
  if (request.action === 'testSettings') {
    debugLog('测试设置...');
    // 创建测试提示
    const testMsg = document.createElement('div');
    testMsg.style.position = 'fixed';
    testMsg.style.top = '50px';
    testMsg.style.left = '50%';
    testMsg.style.transform = 'translateX(-50%)';
    testMsg.style.backgroundColor = 'rgba(44, 123, 229, 0.8)';
    testMsg.style.color = 'white';
    testMsg.style.padding = '10px';
    testMsg.style.borderRadius = '5px';
    testMsg.style.zIndex = '999999';
    testMsg.textContent = `当前设置: 已${settings.enabled ? '启用' : '禁用'}, 模式: ${settings.languageMode}, 延迟: ${settings.hoverDelay}ms`;
    document.body.appendChild(testMsg);
    
    setTimeout(() => testMsg.remove(), 3000);
    sendResponse({ status: 'settings tested' });
    return true;
  }
});

// // 页面加载完成后直接测试
// if (document.readyState === 'complete') {
//   setTimeout(testVisibility, 1000);
// } else {
//   window.addEventListener('load', () => {
//     setTimeout(testVisibility, 1000);
//   });
// }


