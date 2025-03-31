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

// 内容脚本加载时的通知日志
debugLog('Content script loaded');

/**
 * 重构 tooltip 实现，使用 Shadow DOM 和组件化方式
 * 将替代当前的 div 元素实现
 */
class TranslationTooltip {
  constructor() {
    // 创建根容器
    this.container = document.createElement('div');
    this.container.id = 'hover-translate-root';
    this.container.style.position = 'fixed';
    this.container.style.zIndex = '2147483647'; // 最高层级
    this.container.style.pointerEvents = 'none'; // 不阻止点击
    document.body.appendChild(this.container);
    
    // 创建 Shadow DOM
    this.shadow = this.container.attachShadow({ mode: 'closed' });
    
    // 创建样式
    const style = document.createElement('style');
    style.textContent = this.getStyleContent();
    
    // 创建 tooltip 元素
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'tooltip';
    this.tooltip.style.display = 'none';
    
    // 添加到 Shadow DOM
    this.shadow.appendChild(style);
    this.shadow.appendChild(this.tooltip);
    
    debugLog('Translation tooltip component initialized with Shadow DOM');
  }
  
  /**
   * 获取样式内容
   * @returns {string} CSS样式内容
   */
  getStyleContent() {
    return `
      .tooltip {
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
      }
      
      /* 自适应宽度相关样式 */
      .tooltip.short-text {
        width: auto;
        max-width: 280px;
      }
      
      .tooltip.medium-text {
        width: auto;
        max-width: 340px;
      }
      
      .tooltip.long-text {
        width: auto;
        max-width: 400px;
      }
      
      /* 日语特有样式 */
      .header {
        display: flex;
        flex-direction: column;
        margin-bottom: 10px;
      }
      
      .original {
        font-weight: bold;
        margin-bottom: 4px;
      }
      
      .pronunciation {
        color: #666;
        font-size: 0.9em;
        font-family: 'Hiragino Kaku Gothic Pro', 'Meiryo', sans-serif;
        margin-bottom: 6px;
      }
      
      /* 其他样式省略，与之前相同 */
      
      @media (prefers-color-scheme: dark) {
        .tooltip {
          background-color: #2d2d2d;
          color: #e8e8e8;
          border-color: rgba(255, 255, 255, 0.2);
        }
        /* 其他深色模式样式 */
      }
    `;
  }
  
  /**
   * 显示翻译结果
   * @param {Object} translation - 翻译结果对象
   * @param {HTMLElement} targetElement - 目标元素
   */
  show(translation, targetElement) {
    const rect = targetElement.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    // 设置内容
    this.tooltip.innerHTML = this.formatTranslation(translation);
    
    // 根据文本长度应用不同的宽度类
    const textLength = translation.original.length + (translation.translation?.length || 0);
    this.tooltip.classList.remove('short-text', 'medium-text', 'long-text');
    
    if (textLength < 30) {
      this.tooltip.classList.add('short-text');
    } else if (textLength < 100) {
      this.tooltip.classList.add('medium-text');
    } else {
      this.tooltip.classList.add('long-text');
    }
    
    // 设置位置
    this.tooltip.style.top = (rect.bottom + scrollTop + 10) + 'px';
    this.tooltip.style.left = (rect.right + scrollLeft + 5) + 'px';
    this.tooltip.style.display = 'block';
    
    // 防止超出屏幕
    setTimeout(() => this.adjustPosition(), 0);
    
    // 允许tooltip内的交互
    this.container.style.pointerEvents = 'auto';
    
    debugLog('Tooltip displayed at', this.tooltip.style.top, this.tooltip.style.left);
  }
  
  /**
   * 隐藏tooltip
   */
  hide() {
    this.tooltip.style.display = 'none';
    this.container.style.pointerEvents = 'none';
  }
  
  /**
   * 调整位置避免超出屏幕
   */
  adjustPosition() {
    const rect = this.tooltip.getBoundingClientRect();
    
    if (rect.right > window.innerWidth) {
      this.tooltip.style.left = (window.innerWidth - rect.width - 10) + 'px';
    }
    
    if (rect.bottom > window.innerHeight) {
      this.tooltip.style.top = (window.innerHeight - rect.height - 10) + 'px';
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

// 替换现有tooltip创建代码
// const tooltip = document.createElement('div');
// tooltip.id = 'hover-translate-tooltip';
// tooltip.style.display = 'none';
// document.body.appendChild(tooltip);
const translationTooltip = new TranslationTooltip();
debugLog('Translation tooltip component created using Shadow DOM');

// 替换showTooltip函数
function showTooltip(translation, targetElement) {
  translationTooltip.show(translation, targetElement);
  tooltipVisible = true;
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
 * 测试函数 - 验证扩展是否正常工作
 * 在内容脚本加载后2秒显示一个临时通知，3秒后自动消失
 * 用于向用户提供插件活动状态的视觉反馈
 */
setTimeout(() => {
  debugLog('Adding test notification');
  const testDiv = document.createElement('div');
  testDiv.style.position = 'fixed';
  testDiv.style.top = '10px';
  testDiv.style.right = '10px';
  testDiv.style.backgroundColor = 'rgba(0, 123, 255, 0.8)';
  testDiv.style.color = 'white';
  testDiv.style.padding = '5px 10px';
  testDiv.style.borderRadius = '4px';
  testDiv.style.zIndex = '9999999';
  testDiv.style.fontSize = '12px';
  testDiv.textContent = 'Hover Translate activated';
  document.body.appendChild(testDiv);
  
  setTimeout(() => {
    testDiv.remove();
  }, 3000);
}, 2000);

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

/**
 * 性能优化常量
 * 
 * HOVER_DELAY_SHORT: 活跃模式下的短悬停延迟
 * isActiveMode: 用户是否处于活跃翻译模式
 */
const HOVER_DELAY_SHORT = 200;
let isActiveMode = false;

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
  if (distanceMoved > 5 || !isSameElement) {
    // 如果当前有提示显示，隐藏它
    if (tooltipVisible) {
      hideTooltip();
    }
    
    // 重置悬停状态
    hoverStartTime = Date.now();
    mouseMoveCount = 0;
    isHovering = true;
    
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
      mouseMoveCount < 10  // 鼠标移动次数阈值
    ) {
      debugLog(`悬停条件满足 - 持续时间: ${hoverDuration}ms, 移动计数: ${mouseMoveCount}`);
      
      // 确认鼠标位置距离记录位置不远
      const currentDistance = Math.sqrt(
        Math.pow(event.clientX - mouseX, 2) + 
        Math.pow(event.clientY - mouseY, 2)
      );
      
      if (currentDistance < 10) {  // 10像素的容差
        // 启动文本提取和翻译
        startExtraction(element, mouseX, mouseY);
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
 * 启动文本提取和翻译
 * 由handleMouseOver中的计时器调用
 * 提取鼠标位置处的文本并发送翻译请求
 * 
 * @param {HTMLElement} element - 目标DOM元素
 * @param {number} mouseX - 鼠标X坐标
 * @param {number} mouseY - 鼠标Y坐标
 */
async function startExtraction(element, mouseX, mouseY) {
  isExtracting = true;
  
  try {
    // 提取文本 - 调用extractDOMText函数
    const text = await extractDOMText(element, mouseX, mouseY);
    
    if (text && text.trim().length > 0) {
      debugLog(`提取到文本: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`);
      translateText(text, element);
    } else {
      debugLog('未能提取到有效文本');
      hideTooltip();
    }
  } catch (e) {
    debugLog(`文本提取错误: ${e.message}`, 'error');
    hideTooltip();
  } finally {
    isExtracting = false;
    isHovering = false;  // 重置悬停状态
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
  // 获取鼠标移动到的元素
  const relatedTarget = event.relatedTarget;
  
  // 清除悬停计时器
  clearTimeout(hoverTimer);
  
  // 如果鼠标移到工具提示上，不处理
  if (relatedTarget && translationTooltip.container.contains(relatedTarget)) {
    return;
  }
  
  // 标记悬停已结束
  isHovering = false;
  
  // 如果没有显示工具提示，不需要处理
  if (!tooltipVisible) return;
  
  // 小延迟确认鼠标真的离开了
  // 防止鼠标在元素边缘快速移动时提示框闪烁
  setTimeout(() => {
    // 检查鼠标是否仍在原元素或工具提示上
    const isOnTooltip = translationTooltip.container.matches(':hover');
    const isStillOnElement = lastHoveredElement && lastHoveredElement.matches(':hover');
    
    if (!isOnTooltip && !isStillOnElement) {
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
  
  try {
    // 发送消息到后台脚本进行翻译，添加源语言信息
    // background.js中的chrome.runtime.onMessage监听器处理该请求
    chrome.runtime.sendMessage(
      { 
        action: 'translate', 
        text: truncatedText,
        sourceLanguage: sourceLanguage,
        requireDetails: true // 请求详细信息
      },
      (response) => {
        // 检查是否有错误
        if (chrome.runtime.lastError) {
          debugLog('发送消息错误: ' + chrome.runtime.lastError.message, 'error');
          showFallbackTranslation(truncatedText, targetElement, sourceLanguage);
          return;
        }
        
        // 显示翻译结果
        if (response && !response.error) {
          debugLog('收到翻译响应');
          showTooltip(response, targetElement);
        } else {
          debugLog('翻译错误: ' + (response ? response.error : '无响应'), 'error');
          showFallbackTranslation(truncatedText, targetElement, sourceLanguage);
        }
      }
    );
  } catch (error) {
    debugLog('sendMessage异常: ' + error.message, 'error');
    showFallbackTranslation(truncatedText, targetElement, sourceLanguage);
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
const domObserver = setupDOMObserver();

/**
 * 扩展extractDOMText函数，添加用于处理动态内容的增强功能
 * 
 * @param {HTMLElement} element - 鼠标悬停的目标元素
 * @param {number} cursorX - 鼠标X坐标(相对于视口)
 * @param {number} cursorY - 鼠标Y坐标(相对于视口)
 * @returns {Promise<string>} - 提取的文本内容
 */
async function extractDOMText(element, cursorX, cursorY) {
  // 清除现有高亮
  if (highlighter) {
    highlighter.clear();
  } else {
    debugLog('警告: Highlighter对象不存在', 'warn');
  }
  
  debugLog('尝试精确定位文本...');
  
  let textNode = null;
  let offset = 0;
  
  try {
    // 尝试使用更高级的IntersectionObserver API确认元素可见性
    const isVisible = (element) => {
      if (!element) return false;
      const style = window.getComputedStyle(element);
      return style.display !== 'none' && 
             style.visibility !== 'hidden' && 
             style.opacity !== '0' &&
             element.offsetWidth > 0 && 
             element.offsetHeight > 0;
    };
    
    // 方法1: 使用caretPositionFromPoint (现代浏览器标准API)
    if (document.caretPositionFromPoint) {
      const position = document.caretPositionFromPoint(cursorX, cursorY);
      if (position && position.offsetNode && position.offsetNode.nodeType === Node.TEXT_NODE) {
        textNode = position.offsetNode;
        offset = position.offset;
        debugLog('使用caretPositionFromPoint获取文本节点成功');
      }
    }
    
    // 方法2: 替代已弃用的caretRangeFromPoint
    if (!textNode) {
      try {
        // 递归查找最小文本单位
        const findSmallestTextNode = (element) => {
          // 如果是文本节点且非空，直接返回
          if (element.nodeType === Node.TEXT_NODE && element.textContent.trim()) {
            return element;
          }
          
          // 如果是元素节点，递归查找子节点
          if (element.nodeType === Node.ELEMENT_NODE) {
            // 优先查找鼠标直接指向的子元素
            const pointedElements = document.elementsFromPoint(cursorX, cursorY);
            for (const pointedEl of pointedElements) {
              if (element.contains(pointedEl) && pointedEl !== element) {
                const found = findSmallestTextNode(pointedEl);
                if (found) return found;
              }
            }
            
            // 遍历所有子节点
            for (const child of element.childNodes) {
              // 优先处理文本节点
              if (child.nodeType === Node.TEXT_NODE && child.textContent.trim()) {
                return child;
              }
            }
            
            // 处理元素子节点
            for (const child of element.childNodes) {
              if (child.nodeType === Node.ELEMENT_NODE) {
                const found = findSmallestTextNode(child);
                if (found) return found;
              }
            }
          }
          
          return null;
        };
        
        // 从鼠标位置获取元素并找到最小文本节点
        const elements = document.elementsFromPoint(cursorX, cursorY);
        for (const el of elements) {
          // 跳过提示框本身
          if (el === translationTooltip.container || translationTooltip.container.contains(el)) {
            continue;
          }
          
          const smallestNode = findSmallestTextNode(el);
          if (smallestNode) {
            textNode = smallestNode;
            offset = Math.floor(smallestNode.textContent.length / 2);
            debugLog('使用递归方法找到最小文本节点: ' + smallestNode.textContent.substring(0, 20));
            break;
          }
        }
      } catch (e) {
        debugLog('递归查找文本节点失败: ' + e.message, 'warn');
      }
    }
    
    // 添加处理动态内容的额外检查
    if (!textNode) {
      debugLog('尝试使用额外方法定位动态内容');
      
      // 查找光标附近的可见元素
      const visibleElements = [];
      const elements = document.elementsFromPoint(cursorX, cursorY);
      
      for (const el of elements) {
        if (el === translationTooltip.container || translationTooltip.container.contains(el)) continue;
        
        if (isVisible(el)) {
          visibleElements.push(el);
          
          // 对于可能的动态内容容器，深入检查
          if (el.getAttribute('data-dynamic') || // 自定义标记
              el.classList.contains('dynamic') ||
              el.style.overflow === 'auto' || 
              el.style.overflow === 'scroll') {
            
            debugLog('发现可能的动态内容容器: ' + el.nodeName);
            
            // 探测可能被深埋的文本节点
            const allTextNodes = [];
            const walker = document.createTreeWalker(
              el, 
              NodeFilter.SHOW_TEXT, 
              { acceptNode: (node) => node.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT }
            );
            
            while (walker.nextNode()) {
              allTextNodes.push(walker.currentNode);
            }
            
            if (allTextNodes.length > 0) {
              debugLog(`在动态容器中找到 ${allTextNodes.length} 个文本节点`);
              
              // 尝试找到光标下最近的文本节点
              let bestNode = null;
              let minDistance = Number.MAX_VALUE;
              
              for (const node of allTextNodes) {
                try {
                  const range = document.createRange();
                  range.selectNodeContents(node);
                  const rects = range.getClientRects();
                  
                  if (rects.length === 0) continue;
                  
                  // 找到最近的矩形
                  for (let i = 0; i < rects.length; i++) {
                    const rect = rects[i];
                    // 计算光标到矩形中心的距离
                    const centerX = rect.left + rect.width / 2;
                    const centerY = rect.top + rect.height / 2;
                    const distance = Math.sqrt(
                      Math.pow(cursorX - centerX, 2) + 
                      Math.pow(cursorY - centerY, 2)
                    );
                    
                    // 如果在矩形内或很近，优先选择
                    if (cursorX >= rect.left && cursorX <= rect.right &&
                        cursorY >= rect.top && cursorY <= rect.bottom) {
                      bestNode = node;
                      minDistance = 0; // 最高优先级
                      break;
                    }
                    
                    if (distance < minDistance) {
                      minDistance = distance;
                      bestNode = node;
                    }
                  }
                  
                  if (minDistance === 0) break; // 已找到最佳匹配
                } catch (e) {
                  // 忽略错误，继续检查下一个节点
                }
              }
              
              if (bestNode) {
                textNode = bestNode;
                offset = Math.floor(bestNode.textContent.length / 2);
                debugLog('从动态内容中找到文本节点: ' + bestNode.textContent.substring(0, 20));
              }
            }
          }
        }
        
        if (textNode) break;
      }
    }
    
    // 如果找到文本节点，创建范围并扩展
    if (textNode) {
      const range = document.createRange();
      range.setStart(textNode, offset);
      range.setEnd(textNode, offset);
      
      debugLog(`初始光标位置: 文本节点长度${textNode.textContent.length}, 偏移量${offset}`);
      
      // 使用改进的文本扩展函数根据语言特性扩展选择范围
      expandTextSelection(range);
      
      const word = range.toString().trim();
      
      if (word) {
        // 保存当前提取的范围用于后续处理
        lastExtractedRange = {
          text: word,
          node: textNode,
          start: range.startOffset,
          end: range.endOffset
        };
        
        // 高亮选中的文本
        if (highlighter) {
          highlighter.highlightRange(range);
          debugLog('已高亮选中文本');
        } else {
          debugLog('无法高亮：highlighter对象不存在', 'warn');
        }
        
        debugLog(`最终提取文本: "${word}"`);
        return word;
      }
    }
  } catch (e) {
    debugLog(`精确文本提取失败: ${e.message}`, 'error');
  }
  
  // 备用方案：返回元素的简短文本
  const fallbackText = element.textContent?.trim().substring(0, 50) || '';
  if (fallbackText) {
    debugLog(`使用备用文本: "${fallbackText.substring(0, 20)}..."`);
  }
  return fallbackText;
}

/**
 * 文本选择范围扩展函数
 * 由extractDOMText调用，根据文本语言特性智能扩展选择范围
 * 针对日语和拉丁文脚本使用不同的边界识别算法
 * 
 * @param {Range} range - DOM范围对象，将被修改为扩展后的范围
 */
function expandTextSelection(range) {
  if (!range || !range.startContainer || range.startContainer.nodeType !== Node.TEXT_NODE) return;
  
  const textNode = range.startContainer;
  const text = textNode.textContent;
  const offset = range.startOffset;
  
  // 检测当前字符的语言类型
  const charAtOffset = text.charAt(offset) || '';
  const isJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(charAtOffset);
  
  let start = offset;
  let end = offset;
  
  if (isJapanese) {
    // 日语文本扩展逻辑 - 保留日语符号，在标点和空格处停止
    
    // 日语分词保留的符号（不作为分隔符）
    const keepJapaneseSymbols = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u301C\u30FB\u2026\u2015\u2212]/;
    
    // 向左查找 - 在文本边界处停止
    while (start > 0) {
      const prevChar = text.charAt(start - 1);
      // 停止条件：换行、空格、句号等标点
      if (
        prevChar === '\n' || prevChar === '\r' || 
        prevChar === '\u3000' || // 全角空格
        prevChar === ' ' || 
        prevChar === '。' || prevChar === '！' || prevChar === '？' || 
        prevChar === '.' || prevChar === '!' || prevChar === '?'
      ) {
        break;
      }
      
      // 非日语字符且不在保留列表中也停止
      if (!keepJapaneseSymbols.test(prevChar)) {
        break;
      }
      
      start--;
    }
    
    // 向右查找 - 使用相同逻辑
    while (end < text.length) {
      const nextChar = text.charAt(end);
      if (
        nextChar === '\n' || nextChar === '\r' || 
        nextChar === '\u3000' || nextChar === ' ' || 
        nextChar === '。' || nextChar === '！' || nextChar === '？' || 
        nextChar === '.' || nextChar === '!' || nextChar === '?'
      ) {
        break;
      }
      
      if (!keepJapaneseSymbols.test(nextChar)) {
        break;
      }
      
      end++;
    }
    
    // 跳过左侧非文本字符
    while (start < end && !keepJapaneseSymbols.test(text.charAt(start))) {
      start++;
    }
    
    debugLog(`日语文本扩展: 从${offset}扩展到[${start},${end}]，文本："${text.substring(start, end)}"`);
  } else {
    // 非日语文本（英文等）的扩展逻辑 - 使用空格和标点作为边界
    const nonWordChars = /[\s.,;:!?()[\]{}'"\/\\-]/;
    
    // 向左查找单词开始
    while (start > 0 && !nonWordChars.test(text.charAt(start - 1))) {
      start--;
    }
    
    // 向右查找单词结束
    while (end < text.length && !nonWordChars.test(text.charAt(end))) {
      end++;
    }
    
    // 找不到有效单词时使用固定长度
    if (start === end) {
      start = Math.max(0, offset - 5);
      end = Math.min(text.length, offset + 5);
    }
    
    debugLog(`非日语文本扩展: "${text.substring(start, end)}"`);
  }
  
  // 最大长度限制 - 防止选择过长文本
  const MAX_LENGTH = 99999;
  if (end - start > MAX_LENGTH) {
    if (offset - start > end - offset) {
      // 光标偏左，保留右侧
      start = Math.max(0, end - MAX_LENGTH);
    } else {
      // 光标偏右，保留左侧
      end = Math.min(text.length, start + MAX_LENGTH);
    }
    
    debugLog(`文本超过最大长度，截断到: "${text.substring(start, end)}"`);
  }
  
  // 应用新范围
  range.setStart(textNode, start);
  range.setEnd(textNode, end);
}

/**
 * 查找最相关段落
 * 作为备选文本提取方法，尝试找到鼠标位置附近最相关的段落
 * 由extractDOMText在精确定位失败时调用
 * 
 * @param {HTMLElement} element - 目标DOM元素
 * @param {number} x - 鼠标X坐标
 * @param {number} y - 鼠标Y坐标
 * @returns {string|null} - 提取的段落文本或null
 */
function findMostRelevantParagraph(element, x, y) {
  // 尝试找到鼠标下最近的段落元素
  let paragraph = element.closest('p, article, div, li, td, th, h1, h2, h3, h4, h5, h6');
  
  // 如果段落太长，尝试找到更小的文本块
  if (paragraph && paragraph.textContent.length > 300) {
    // 创建TreeWalker找到文本节点
    const walker = document.createTreeWalker(
      paragraph,
      NodeFilter.SHOW_TEXT,
      { 
        acceptNode: (node) => {
          // 只接受非空文本节点
          return node.textContent.trim().length > 0 
            ? NodeFilter.FILTER_ACCEPT 
            : NodeFilter.FILTER_REJECT;
        }
      }
    );
    
    // 查找最近的10个文本节点
    const textNodes = [];
    let count = 0;
    while (walker.nextNode() && count < 10) {
      textNodes.push(walker.currentNode);
      count++;
    }
    
    // 返回找到的第一个文本节点内容
    if (textNodes.length > 0) {
      return textNodes[0].textContent.trim();
    }
  }
  
  // 返回段落文本或null
  return paragraph ? paragraph.textContent.trim() : null;
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
    this.highlightContainer.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:999995;';
    document.body.appendChild(this.highlightContainer);
    
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
          z-index: 999998;
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
    if (!range) return;
    
    this.clear();
    
    try {
      const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
      const scrollY = window.pageYOffset || document.documentElement.scrollTop;
      
      // 获取范围的位置矩形
      const rects = range.getClientRects();
      if (!rects || rects.length === 0) return;
      
      // 使用DocumentFragment减少DOM重绘
      const fragment = document.createDocumentFragment();
      let count = 0;
      
      // 最多处理5个矩形区域，避免性能问题
      const maxRects = Math.min(rects.length, 5);
      
      for (let i = 0; i < maxRects; i++) {
        const rect = rects[i];
        // 忽略太小的矩形
        if (rect.width < 2 || rect.height < 2) continue;
        
        const mask = document.createElement('div');
        mask.className = 'hover-translate-highlight-mask';
        
        // 一次性设置所有样式，减少回流
        Object.assign(mask.style, {
          left: (rect.left + scrollX) + 'px',
          top: (rect.top + scrollY) + 'px',
          width: rect.width + 'px',
          height: rect.height + 'px',
          transition: 'none'
        });
        
        // 存储原始位置信息
        mask.dataset.originalLeft = (rect.left + scrollX) + '';
        mask.dataset.originalTop = (rect.top + scrollY) + '';
        
        fragment.appendChild(mask);
        this.highlightElements.push(mask);
        count++;
      }
      
      // 一次性添加所有元素
      this.highlightContainer.appendChild(fragment);
      debugLog(`创建了${count}个高亮元素`);
    } catch (e) {
      debugLog('高亮创建失败: ' + e.message, 'error');
    }
  }
  
  /**
   * 更新高亮位置
   * 在页面滚动时保持高亮位置与文本对齐
   */
  updatePositions() {
    if (this.highlightElements.length === 0) return;
    
    // 获取当前滚动位置
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    
    // 更新每个高亮元素的位置
    for (const el of this.highlightElements) {
      if (!el.dataset.originalLeft) continue;
      
      // 从保存的原始位置计算新位置
      const originalLeft = parseFloat(el.dataset.originalLeft);
      const originalTop = parseFloat(el.dataset.originalTop);
      
      // 设置元素位置
      el.style.left = originalLeft + 'px';
      el.style.top = originalTop + 'px';
      
      // 记录当前滚动位置
      el.dataset.lastScrollX = scrollX + '';
      el.dataset.lastScrollY = scrollY + '';
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
      
      // 如果正在显示工具提示且不在提取中，隐藏提示
      if (tooltipVisible && !isExtracting) {
        hideTooltip();
      }
    }
    
    // 更新记录的位置
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
  }
}, { passive: true });

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