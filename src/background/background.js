/**
 * 悬停翻译扩展的后台脚本
 * 作为扩展的中央控制器，处理翻译请求和管理设置
 * 在扩展安装/启动时自动加载，并在浏览器运行期间保持活跃
 */

/**
 * 调试日志函数
 * 在开发和调试过程中用于记录后台脚本活动
 * 
 * @param {string} message - 要记录的消息
 */
function debugLog(message) {
  console.log('[Hover Translate BG]', message);
}

// 通知后台脚本已加载
debugLog('Background script loaded');

/**
 * 扩展安装/更新事件处理函数
 * 在扩展首次安装或更新时触发
 * 初始化默认设置并确保设置完整
 */
chrome.runtime.onInstalled.addListener((details) => {
  debugLog('Extension installed/updated: ' + details.reason);
  if (details.reason === 'install') {
    // 首次安装时设置默认值
    chrome.storage.sync.set({
      enabled: true,
      targetLanguages: ['ja', 'en'],
      showPronunciation: true,
      showExamples: true,
      hoverDelay: 500
    });
    debugLog('Default settings initialized');
  }

  // 获取当前设置，确保语言模式设置存在
  chrome.storage.sync.get([
    'enabled', 'languageMode', 'jaOnly', 'enOnly'
  ], (result) => {
    // 检查是否需要设置默认值
    const needsDefaultSettings = 
      details.reason === 'install' || 
      typeof result.languageMode === 'undefined';
    
    if (needsDefaultSettings) {
      console.log('设置扩展默认值: 启用日语翻译');
      
      // 设置默认语言模式为日语
      chrome.storage.sync.set({
        enabled: true,
        languageMode: 'ja',
        jaOnly: true,
        enOnly: false
      }, () => {
        console.log('默认设置已应用');
      });
    }
  });
});

/**
 * DeepSeek API配置对象
 * 用于日语翻译服务的API参数
 * 在translateWithDeepSeek函数中使用
 * 
 * @const {Object} DEEPSEEK_API_CONFIG
 * @property {string} apiKey - DeepSeek API密钥
 * @property {string} apiUrl - API端点URL
 * @property {string} model - 使用的模型名称
 * @property {number} temperature - 生成随机性参数(0-2)
 * @property {number} maxTokens - 最大生成token数
 */
const DEEPSEEK_API_CONFIG = {
  apiKey: "sk-862e6660da97422bb8c1115b019a4bfe", // 实际部署时应从安全存储获取
  apiUrl: "https://api.deepseek.com/v1/chat/completions",
  model: "deepseek-chat",
  temperature: 1, // 低温度获得更一致的翻译
  maxTokens: 300 // 控制响应长度
};

/**
 * 消息处理器
 * 处理来自内容脚本和弹出窗口的消息
 * 由chrome.runtime.onMessage事件触发
 * 
 * @param {Object} request - 消息请求对象
 * @param {Object} sender - 消息发送者信息
 * @param {Function} sendResponse - 用于发送响应的回调函数
 * @returns {boolean} - 是否需要保持sendResponse回调有效
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 处理翻译请求
  if (request.action === 'translate') {
    const sourceText = request.text;
    const sourceLanguage = request.sourceLanguage || 'auto';
    
    console.log(`翻译请求: 源语言=${sourceLanguage}, 文本="${sourceText.substring(0, 20)}..."`);
    
    // 根据源语言选择不同翻译方法
    if (sourceLanguage === 'ja') {
      // 日语使用DeepSeek API
      translateWithDeepSeek(sourceText).then(result => {
        sendResponse(result);
      }).catch(error => {
        console.error('日语翻译出错:', error);
        sendResponse({ error: '日语翻译服务暂时不可用' });
      });
      
      return true; // 异步发送响应，保持通道开放
    } else if (sourceLanguage === 'en') {
      // 英语使用另一翻译API或方法
      translateEnglish(sourceText).then(result => {
        sendResponse(result);
      }).catch(error => {
        console.error('英语翻译出错:', error);
        sendResponse({ error: '英语翻译服务暂时不可用' });
      });
      
      return true; // 异步发送响应
    } else {
      // 不支持的语言
      sendResponse({
        original: sourceText,
        translation: '不支持的语言类型',
        sourceLanguage: sourceLanguage,
        targetLanguage: 'zh',
        unsupported: true
      });
      
      return true;
    }
  }
  
  // 处理其他类型的消息
  debugLog('Unknown message action: ' + request.action);
  return false;
});

/**
 * 简单语言检测函数
 * 基于字符集判断文本语言
 * 可由background.js内部调用进行二次确认
 * 
 * @param {string} text - 要检测的文本
 * @returns {string} - 检测到的语言代码('ja'|'en')
 */
function detectLanguage(text) {
  // 检查日语字符（平假名、片假名、汉字）
  const japaneseRegex = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/;
  if (japaneseRegex.test(text)) {
    return 'ja';
  }
  // 默认为英语
  return 'en';
}

/**
 * 使用DeepSeek API进行日语翻译
 * 由消息处理器针对日语文本调用
 * 发送API请求并处理响应
 * 
 * @async
 * @param {string} text - 要翻译的日语文本
 * @returns {Promise<Object>} - 翻译结果对象
 */
async function translateWithDeepSeek(text) {
  try {
    // 获取API密钥，优先使用配置值，否则从存储获取
    const apiKey = DEEPSEEK_API_CONFIG.apiKey || await getStoredApiKey();
    
    if (!apiKey) {
      throw new Error('未配置DeepSeek API密钥');
    }
    
    // 构建请求，添加系统提示词以获得结构化响应
    const requestBody = {
      model: DEEPSEEK_API_CONFIG.model,
      messages: [
        {
          role: "system",
          content: `请将用户输入的日语内容翻译成地道的中文。
          请按以下格式提供翻译结果(仅返回JSON格式，不要添加任何额外文本):
          {
            "translation": "完整的中文翻译",
            "keywords": [
              {"word": "关键词", "meaning": "中文释义", "reading": "假名读音"},
              {"grama": "主要語法", "meaning": "中文释义", "reading": "假名读音"},
            ],
          }`
        },
        {
          role: "user",
          content: text
        }
      ],
      temperature: 1,
      max_tokens: 300
    };
    
    // 发送API请求
    const response = await fetch(DEEPSEEK_API_CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });
    
    // 检查响应状态
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API请求失败: ${response.status} - ${JSON.stringify(errorData)}`);
    }
    
    // 解析API响应
    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content;
    
    if (!aiResponse) {
      throw new Error('DeepSeek返回了空响应');
    }
    
    // 改进JSON解析部分，处理可能的格式问题
    let parsedResponse;
    try {
      // 查找JSON部分，处理非JSON前缀/后缀
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : aiResponse;
      
      try {
        parsedResponse = JSON.parse(jsonStr);
      } catch (jsonError) {
        // 完整解析失败时尝试修复
        console.warn('完整JSON解析失败，尝试修复JSON格式...', jsonError);
        parsedResponse = extractJSONLike(aiResponse);
      }
    } catch (parseError) {
      console.error('解析DeepSeek响应失败:', parseError);
      // 回退到文本处理
      parsedResponse = {
        translation: cleanupAIText(aiResponse)
      };
    }
    
    // 标准化响应格式为统一结构
    const normalizedResponse = {
      original: text,
      translation: parsedResponse.translation || '未能获取翻译',
      pronunciation: parsedResponse.pronunciation || '',
      sourceLanguage: 'ja',
      targetLanguage: 'zh',
      details: {
        // 整理关键词释义
        definitions: Array.isArray(parsedResponse.keywords) 
          ? parsedResponse.keywords.map(k => 
              `${k.word || ''} ${k.reading ? `(${k.reading})` : ''}: ${k.meaning || ''}`)
          : []
      },
      // 标准化例句格式
      examples: Array.isArray(parsedResponse.examples) 
        ? parsedResponse.examples.map(ex => {
            if (typeof ex === 'string') {
              // 处理纯字符串格式例句
              const parts = ex.split(/[|｜]/).map(s => s.trim());
              return { 
                text: parts[0] || '', 
                translation: parts[1] || '' 
              };
            } else if (ex && typeof ex === 'object') {
              // 处理对象格式例句
              return { 
                text: ex.japanese || ex.text || ex.source || '', 
                translation: ex.chinese || ex.translation || ex.target || '' 
              };
            }
            return { text: '', translation: '' };
          }).filter(ex => ex.text && ex.translation) // 过滤掉空例句
        : []
    };
    
    // 记录标准化响应用于调试
    console.log('标准化的翻译响应:', normalizedResponse);
    
    return normalizedResponse;
  } catch (error) {
    console.error('DeepSeek翻译失败:', error);
    
    // 返回错误信息
    return {
      original: text,
      translation: '使用DeepSeek API翻译失败: ' + error.message,
      sourceLanguage: 'ja',
      targetLanguage: 'zh',
      error: error.message
    };
  }
}

/**
 * 清理AI响应文本
 * 移除不必要的Markdown标记和空白
 * 
 * @param {string} text - 原始AI响应文本
 * @returns {string} - 清理后的文本
 */
function cleanupAIText(text) {
  // 移除Markdown标记、代码块等
  return text
    .replace(/```json|```/g, '')
    .replace(/^\s*[\r\n]+|[\r\n]+\s*$/g, '')
    .substring(0, 500);
}

/**
 * 从不完整/损坏的JSON中提取数据
 * 当JSON.parse失败时尝试提取关键信息
 * 
 * @param {string} text - 可能包含JSON的文本
 * @returns {Object} - 提取的数据对象
 */
function extractJSONLike(text) {
  const result = {
    translation: '',
    pronunciation: '',
    keywords: [],
    examples: []
  };
  
  // 尝试提取翻译部分
  const translationMatch = text.match(/"translation"\s*:\s*"([^"]*)"/);
  if (translationMatch) result.translation = translationMatch[1];
  
  // 尝试提取发音部分
  const pronMatch = text.match(/"pronunciation"\s*:\s*"([^"]*)"/);
  if (pronMatch) result.pronunciation = pronMatch[1];
  
  // 如果没有提取到任何内容，使用整个文本作为翻译
  if (!result.translation) {
    result.translation = cleanupAIText(text);
  }
  
  return result;
}

/**
 * 获取存储的API密钥
 * 从chrome.storage读取用户配置的API密钥
 * 
 * @async
 * @returns {Promise<string>} - 存储的API密钥或空字符串
 */
async function getStoredApiKey() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['deepseekApiKey'], (result) => {
      resolve(result.deepseekApiKey || '');
    });
  });
}

/**
 * 保存API密钥
 * 将用户提供的API密钥保存到chrome.storage
 * 
 * @async
 * @param {string} apiKey - 要保存的API密钥
 * @returns {Promise<boolean>} - 保存成功返回true
 */
function saveApiKey(apiKey) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ deepseekApiKey: apiKey }, () => {
      resolve(true);
    });
  });
}

/**
 * 英语翻译函数
 * 处理英语文本的翻译请求
 * 由消息处理器针对英语文本调用
 * 
 * @async
 * @param {string} text - 要翻译的英语文本
 * @returns {Promise<Object>} - 翻译结果对象
 */
async function translateEnglish(text) {
  try {
    // 这里实际使用翻译API，当前为模拟响应
    // 实际实现时需替换为真实API调用
    
    // 返回模拟的翻译结果
    return {
      original: text,
      translation: `"${text}"的中文翻译`,
      pronunciation: '/ɪɡˈzæmpəl/',
      sourceLanguage: 'en',
      targetLanguage: 'zh',
      examples: [
        {
          text: `The word "${text}" is commonly used in this context.`,
          translation: `"${text}"这个词在这种情况下经常使用。`
        },
        {
          text: `Here's another example with "${text}".`,
          translation: `这是另一个使用"${text}"的例子。`
        }
      ],
      details: {
        definitions: [
          {
            partOfSpeech: '名词',
            meanings: [
              {
                english: 'The primary meaning of the word',
                chinese: '这个词的主要含义'
              },
              {
                english: 'A secondary meaning in certain contexts',
                chinese: '在特定情境下的次要含义'
              }
            ]
          },
          {
            partOfSpeech: '动词',
            meanings: [
              {
                english: 'To perform the action',
                chinese: '执行该动作'
              }
            ]
          }
        ]
      }
    };
  } catch (error) {
    console.error('英语翻译请求失败:', error);
    return {
      original: text,
      translation: '翻译暂时不可用',
      sourceLanguage: 'en',
      targetLanguage: 'zh',
      error: error.message
    };
  }
}