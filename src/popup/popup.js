/**
 * 悬停翻译扩展的弹出窗口脚本
 * 负责用户界面交互和设置管理
 */

/**
 * 重构版本的弹出窗口脚本
 * 使用更现代的结构和命名约定
 */
document.addEventListener('DOMContentLoaded', () => {
  /**
   * DOM元素引用 - 新版UI
   * 在DOMContentLoaded回调内获取，确保元素已存在
   */
  const enableToggle = document.getElementById('enableToggle');
  const jaOnlyRadio = document.getElementById('jaOnly');
  const enOnlyRadio = document.getElementById('enOnly');
  const allLangRadio = document.getElementById('allLang');
  const delaySlider = document.getElementById('delaySlider');
  const delayValueSpan = document.getElementById('delayValue');
  const saveButton = document.getElementById('saveButton');
  const debugModeToggle = document.getElementById('debugMode');
  
  /**
   * 当前设置缓存
   * 保存当前加载的设置，用于比较变更
   */
  let currentSettings = {
    enabled: true,           // 插件启用状态
    languageMode: 'ja',      // 语言模式(ja|en|all)
    hoverDelay: 1000,        // 悬停延迟(毫秒)
    debugMode: false         // 调试模式
  };
  
  /**
   * 加载设置
   * 从chrome.storage加载保存的设置
   * 在DOMContentLoaded事件中自动调用
   */
  function loadSettings() {
    console.log('加载设置...');
    chrome.storage.sync.get([
      'enabled', 
      'languageMode', 
      'hoverDelay',
      'debugMode'
    ], (result) => {
      console.log('已获取设置:', result);
      
      // 更新当前设置缓存
      if (result.enabled !== undefined) currentSettings.enabled = result.enabled;
      if (result.languageMode) currentSettings.languageMode = result.languageMode;
      if (result.hoverDelay) currentSettings.hoverDelay = result.hoverDelay;
      if (result.debugMode !== undefined) currentSettings.debugMode = result.debugMode;
      
      // 更新UI以反映加载的设置
      updateUIFromSettings();
    });
  }
  
  /**
   * 从设置更新UI
   * 将当前设置应用到UI元素
   * 由loadSettings调用，确保UI反映当前设置
   */
  function updateUIFromSettings() {
    // 启用开关
    if (enableToggle) enableToggle.checked = currentSettings.enabled;
    
    // 语言模式单选按钮
    if (jaOnlyRadio && currentSettings.languageMode === 'ja') jaOnlyRadio.checked = true;
    if (enOnlyRadio && currentSettings.languageMode === 'en') enOnlyRadio.checked = true;
    if (allLangRadio && currentSettings.languageMode === 'all') allLangRadio.checked = true;
    
    // 延迟滑块
    if (delaySlider) delaySlider.value = currentSettings.hoverDelay;
    if (delayValueSpan) delayValueSpan.textContent = currentSettings.hoverDelay;
    
    // 调试模式
    if (debugModeToggle) debugModeToggle.checked = currentSettings.debugMode;
  }
  
  /**
   * 从UI更新设置
   * 收集当前UI状态并创建设置对象
   * 由saveSettings调用，准备要保存的设置
   * 
   * @returns {Object|null} 收集的设置对象，如果缺少必要元素则返回null
   */
  function updateSettingsFromUI() {
    // 验证必要元素是否存在
    if (!enableToggle || !delaySlider) {
      console.error('无法找到必要的DOM元素');
      return null;
    }
    
    // 确定当前选中的语言模式
    let languageMode = 'ja'; // 默认值
    if (jaOnlyRadio && jaOnlyRadio.checked) languageMode = 'ja';
    else if (enOnlyRadio && enOnlyRadio.checked) languageMode = 'en';
    else if (allLangRadio && allLangRadio.checked) languageMode = 'all';
    
    // 返回收集的设置
    return {
      enabled: enableToggle.checked,
      languageMode: languageMode,
      hoverDelay: parseInt(delaySlider.value) || 500,  // 提供默认值以防转换失败
      debugMode: debugModeToggle ? debugModeToggle.checked : false
    };
  }
  
  /**
   * 保存设置
   * 收集UI设置并保存到chrome.storage
   * 由保存按钮点击事件触发
   */
  function saveSettings() {
    const newSettings = updateSettingsFromUI();
    if (!newSettings) {
      console.error('无法获取当前UI设置');
      return;
    }
    
    console.log('保存设置:', newSettings);
    
    chrome.storage.sync.set(newSettings, () => {
      // 检查是否出现错误
      if (chrome.runtime.lastError) {
        console.error('设置保存失败:', chrome.runtime.lastError);
        alert('设置保存失败: ' + chrome.runtime.lastError.message);
        return;
      }
      
      console.log('设置已成功保存');
      currentSettings = newSettings;
      
      // 显示视觉反馈
      if (saveButton) {
        saveButton.textContent = '✓ 已保存';
        saveButton.style.backgroundColor = '#4CAF50';
        
        setTimeout(() => {
          saveButton.textContent = '应用设置';
          saveButton.style.backgroundColor = '';
        }, 1500);
      }
      
      // 立即验证保存是否成功
      chrome.storage.sync.get(Object.keys(newSettings), checkResult => {
        console.log('保存验证:', checkResult);
      });
    });
  }
  
  /**
   * 事件监听器设置
   * 处理UI交互，在DOMContentLoaded内添加
   */
  
  // 延迟滑块事件
  if (delaySlider) {
    delaySlider.addEventListener('input', () => {
      if (delayValueSpan) delayValueSpan.textContent = delaySlider.value;
    });
  }
  
  // 保存按钮事件
  if (saveButton) {
    saveButton.addEventListener('click', saveSettings);
  }
  
  // 预设按钮事件
  document.querySelectorAll('.preset-button').forEach(button => {
    if (button) {
      button.addEventListener('click', () => {
        // 应用预设延迟值
        const presetDelay = parseInt(button.getAttribute('data-delay'));
        if (delaySlider) delaySlider.value = presetDelay;
        if (delayValueSpan) delayValueSpan.textContent = presetDelay;
      });
    }
  });
  
  // 在saveButton事件监听器上方添加
  // 临时调试按钮
  const debugBtn = document.createElement('button');
  debugBtn.textContent = '显示当前设置';
  debugBtn.style.marginBottom = '10px';
  debugBtn.addEventListener('click', () => {
    chrome.storage.sync.get(null, result => {
      alert('当前设置: ' + JSON.stringify(result, null, 2));
    });
  });
  document.body.appendChild(debugBtn);
  
  // 初始加载设置
  loadSettings();
});

/**
 * 测试按钮功能
 * 在弹出窗口底部添加测试按钮，用于验证设置是否已应用
 */

// 创建测试按钮元素
const testButton = document.createElement('button');
testButton.id = 'testButton';
testButton.className = 'test-button';
testButton.textContent = '测试设置';
// 注意：此语句要求.footer元素在DOM中存在，否则会失败
document.querySelector('.footer').appendChild(testButton);

/**
 * 测试按钮点击处理函数
 * 发送测试消息到当前活动标签页的内容脚本
 */
testButton.addEventListener('click', () => {
  // 向当前标签页发送测试消息
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'testSettings' }, (response) => {
        // 处理错误
        if (chrome.runtime.lastError) {
          console.error('测试失败:', chrome.runtime.lastError);
          alert('测试失败: ' + chrome.runtime.lastError.message);
          return;
        }
        
        // 显示测试结果
        if (response && response.success) {
          alert(`设置已应用:\n延迟: ${response.settings.hoverDelay}ms\n语言模式: ${response.settings.languageMode}`);
        } else {
          alert('设置测试失败');
        }
      });
    }
  });
});

// 在 content.js 顶部
console.log('[Hover Translate] 内容脚本已加载，设置存储变更监听器');

// 在监听器内添加无条件日志
chrome.storage.onChanged.addListener((changes, areaName) => {
  console.log('[Hover Translate] 检测到存储变更:', changes, '区域:', areaName);
  
  // 现有代码...
});